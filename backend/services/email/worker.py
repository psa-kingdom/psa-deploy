import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.core.config import settings
from backend.services.email.provider import send_email_via_provider
from backend.models.email import OutboxJobStatus, RecipientStatus, CampaignStatus

logger = logging.getLogger(__name__)

class OutboxWorker:
    def __init__(self, db: AsyncIOMotorDatabase, dispatch_rate_per_sec: float = 2.0):
        self.db = db
        self.dispatch_interval = 1.0 / dispatch_rate_per_sec
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._startup_and_run())
            logger.info("Email Outbox Worker started.")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("Email Outbox Worker stopped cleanly.")

    async def _startup_and_run(self):
        """
        Run stale job recovery once on startup before entering the main loop.
        """
        await self._reclaim_stale_jobs()
        await self._run_loop()

    async def _reclaim_stale_jobs(self):
        """
        Resets jobs that were left in 'processing' state due to a prior crash or
        unclean shutdown. Any job in 'processing' for more than 5 minutes is
        considered stale and reset to 'pending' so it can be re-dispatched.
        """
        stale_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        result = await self.db.outbox_jobs.update_many(
            {
                "status": OutboxJobStatus.PROCESSING.value,
                "updated_at": {"$lt": stale_cutoff}
            },
            {
                "$set": {
                    "status": OutboxJobStatus.PENDING.value,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        if result.modified_count > 0:
            logger.warning(
                f"Stale job recovery: reset {result.modified_count} stuck 'processing' "
                f"job(s) back to 'pending'."
            )

    async def _run_loop(self):
        while self.is_running:
            try:
                job = await self._claim_next_job()
                if job:
                    await self._process_job(job)
                    await asyncio.sleep(self.dispatch_interval)
                else:
                    # No pending jobs, sleep shortly
                    await asyncio.sleep(1.0)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning(f"Outbox Worker waiting for database connection: {exc}")
                await asyncio.sleep(5.0)

    async def _claim_next_job(self) -> Optional[dict]:
        """
        Atomically finds and claims a pending job whose next_attempt_at <= now.
        """
        now = datetime.now(timezone.utc)
        job = await self.db.outbox_jobs.find_one_and_update(
            {
                "status": OutboxJobStatus.PENDING.value,
                "next_attempt_at": {"$lte": now}
            },
            {
                "$set": {
                    "status": OutboxJobStatus.PROCESSING.value,
                    "updated_at": now
                }
            }
        )
        return job

    async def _process_job(self, job: dict):
        job_id = job["job_id"]
        campaign_id = job.get("campaign_id")
        job_type = job.get("job_type", "campaign")
        transactional_type = job.get("transactional_type")
        source_entity_type = job.get("source_entity_type")
        source_entity_id = job.get("source_entity_id")
        idempotency_key = job.get("idempotency_key")
        recipient_email = job["recipient_email"]
        recipient_id = job.get("recipient_id")
        now = datetime.now(timezone.utc)

        # Check if parent campaign was cancelled or confirmed for production
        is_production_dispatch = False
        if campaign_id:
            campaign = await self.db.email_campaigns.find_one({"campaign_id": campaign_id})
            if campaign and campaign.get("status") == CampaignStatus.CANCELLED.value:
                logger.info(f"Campaign {campaign_id} was cancelled. Cancelling job {job_id}.")
                await self.db.outbox_jobs.update_one(
                    {"job_id": job_id},
                    {"$set": {"status": OutboxJobStatus.CANCELLED.value, "updated_at": now}}
                )
                if recipient_id:
                    await self.db.campaign_recipients.update_one(
                        {"id": recipient_id},
                        {"$set": {"status": RecipientStatus.CANCELLED.value}}
                    )
                return
            if campaign and campaign.get("send_mode") == "production":
                is_production_dispatch = True
        elif job_type == "transactional":
            # For transactional dispatches, allow delivery in production environment
            if settings.EMAIL_ENVIRONMENT == "production":
                is_production_dispatch = True

        # Attempt Email Dispatch
        result = await send_email_via_provider(
            to=recipient_email,
            subject=job["subject"],
            html=job["rendered_html"],
            text=job.get("rendered_text"),
            sender=job.get("sender"),
            reply_to=job.get("reply_to"),
            campaign_id=campaign_id,
            job_id=job_id,
            db=self.db,
            is_production_dispatch=is_production_dispatch,
            idempotency_key=idempotency_key,
            job_type=job_type,
            transactional_type=transactional_type
        )

        if result["success"]:
            # Success
            resend_id = result.get("resend_id")
            await self.db.outbox_jobs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": OutboxJobStatus.COMPLETED.value,
                        "resend_message_id": resend_id,
                        "delivery_status": "sent",
                        "updated_at": now
                    }
                }
            )
            if recipient_id:
                await self.db.campaign_recipients.update_one(
                    {"id": recipient_id},
                    {
                        "$set": {
                            "status": RecipientStatus.DISPATCHED.value,
                            "resend_message_id": resend_id,
                            "dispatched_at": now
                        }
                    }
                )
            if campaign_id:
                await self.db.email_campaigns.update_one(
                    {"campaign_id": campaign_id},
                    {"$inc": {"dispatched_count": 1}}
                )
            if source_entity_type == "contact_submission" and source_entity_id:
                await self.db.contact_submissions.update_one(
                    {"id": source_entity_id},
                    {"$set": {"acknowledgement_status": "sent", "resend_message_id": resend_id}}
                )
            elif source_entity_type == "newsletter_subscription" and source_entity_id:
                await self.db.newsletter_subscriptions.update_one(
                    {"id": source_entity_id},
                    {"$set": {"welcome_email_status": "sent", "resend_message_id": resend_id}}
                )
        elif result.get("status") == "blocked_test_mode":
            # Blocked by provider's test mode safety guard (Layer 2 defense).
            logger.error(
                "Job %s reached provider but was blocked by test mode safety guard. "
                "Campaign: %s, Recipient: %s.",
                job_id, campaign_id, recipient_email
            )
            await self.db.outbox_jobs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": OutboxJobStatus.FAILED.value,
                        "error_details": result.get("error"),
                        "updated_at": now
                    }
                }
            )
            if recipient_id:
                await self.db.campaign_recipients.update_one(
                    {"id": recipient_id},
                    {
                        "$set": {
                            "status": RecipientStatus.SKIPPED_SUPPRESSION.value,
                            "error_message": result.get("error")
                        }
                    }
                )
            if source_entity_type == "contact_submission" and source_entity_id:
                await self.db.contact_submissions.update_one(
                    {"id": source_entity_id},
                    {"$set": {"acknowledgement_status": "blocked_test_mode"}}
                )
            elif source_entity_type == "newsletter_subscription" and source_entity_id:
                await self.db.newsletter_subscriptions.update_one(
                    {"id": source_entity_id},
                    {"$set": {"welcome_email_status": "blocked_test_mode"}}
                )
        else:
            # Failed attempt
            attempts = job.get("attempts", 0) + 1
            max_attempts = job.get("max_attempts", 3)
            error_msg = result.get("error", "Unknown dispatch failure")

            if attempts >= max_attempts:
                # Permanent failure
                await self.db.outbox_jobs.update_one(
                    {"job_id": job_id},
                    {
                        "$set": {
                            "status": OutboxJobStatus.FAILED.value,
                            "attempts": attempts,
                            "error_details": error_msg,
                            "updated_at": now
                        }
                    }
                )
                if recipient_id:
                    await self.db.campaign_recipients.update_one(
                        {"id": recipient_id},
                        {
                            "$set": {
                                "status": RecipientStatus.BOUNCED.value,
                                "error_message": error_msg
                            }
                        }
                    )
                if campaign_id:
                    await self.db.email_campaigns.update_one(
                        {"campaign_id": campaign_id},
                        {"$inc": {"failed_count": 1}}
                    )
                if source_entity_type == "contact_submission" and source_entity_id:
                    await self.db.contact_submissions.update_one(
                        {"id": source_entity_id},
                        {"$set": {"acknowledgement_status": "failed", "error_message": error_msg}}
                    )
                elif source_entity_type == "newsletter_subscription" and source_entity_id:
                    await self.db.newsletter_subscriptions.update_one(
                        {"id": source_entity_id},
                        {"$set": {"welcome_email_status": "failed", "error_message": error_msg}}
                    )
            else:
                # Retry with exponential backoff (30s, 60s, 120s)
                backoff_seconds = 30 * (2 ** (attempts - 1))
                next_attempt = now + timedelta(seconds=backoff_seconds)
                await self.db.outbox_jobs.update_one(
                    {"job_id": job_id},
                    {
                        "$set": {
                            "status": OutboxJobStatus.PENDING.value,
                            "attempts": attempts,
                            "next_attempt_at": next_attempt,
                            "error_details": error_msg,
                            "updated_at": now
                        }
                    }
                )

        # Check if parent campaign is completed
        if campaign_id:
            await self._check_campaign_completion(campaign_id)

    async def _check_campaign_completion(self, campaign_id: str):
        campaign = await self.db.email_campaigns.find_one({"campaign_id": campaign_id})
        if not campaign or campaign.get("status") in (CampaignStatus.COMPLETED.value, CampaignStatus.CANCELLED.value):
            return

        frozen_count = campaign.get("frozen_recipient_count", 0)
        # Count remaining pending / processing outbox jobs for this campaign
        pending_jobs = await self.db.outbox_jobs.count_documents({
            "campaign_id": campaign_id,
            "status": {"$in": [OutboxJobStatus.PENDING.value, OutboxJobStatus.PROCESSING.value]}
        })

        if pending_jobs == 0:
            now = datetime.now(timezone.utc)
            await self.db.email_campaigns.update_one(
                {"campaign_id": campaign_id},
                {
                    "$set": {
                        "status": CampaignStatus.COMPLETED.value,
                        "completed_at": now
                    }
                }
            )
            logger.info(f"Campaign {campaign_id} completed successfully (total frozen: {frozen_count}).")
