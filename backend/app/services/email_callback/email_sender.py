import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings
from app.utils.logger import logger


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Dispatch an HTML email via SMTP (e.g. Gmail App Password).
    Handles missing credentials and network errors without crashing.
    """
    smtp_host = settings.resolved_smtp_host
    smtp_port = settings.resolved_smtp_port
    smtp_user = settings.resolved_smtp_user
    smtp_pass = settings.resolved_smtp_pass

    # If SMTP credentials are not configured, log simulation and gracefully exit
    if not smtp_user or not smtp_pass:
        logger.warning(
            f"[SMTP Simulation] EMAIL_USER / EMAIL_PASSWORD not provided in .env. "
            f"Simulated email send to '{to_email}' with subject: '{subject}'."
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"TokenSaver RAG <{smtp_user}>"
        msg["To"] = to_email

        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)

        logger.info(f"Connecting to SMTP server {smtp_host}:{smtp_port} for {to_email}...")
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [to_email], msg.as_string())

        logger.info(f"Email successfully delivered to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
        return False
