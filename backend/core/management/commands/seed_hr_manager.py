"""
Management command to seed the HR Manager superuser and generate an auth token.

Usage:
    python manage.py seed_hr_manager
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from rest_framework.authtoken.models import Token

User = get_user_model()

DEFAULT_USERNAME = "sagar_menat"
DEFAULT_EMAIL = "sagar.menat@trootech.com"
DEFAULT_PASSWORD = "Test@123"


class Command(BaseCommand):
    help = "Create the HR Manager superuser and print the auth token."

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            username=DEFAULT_USERNAME,
            defaults={
                "email": DEFAULT_EMAIL,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if created:
            user.set_password(DEFAULT_PASSWORD)
            user.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Superuser "{DEFAULT_USERNAME}" created successfully.'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    f"  Default password: {DEFAULT_PASSWORD}"
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    "  ⚠  Change this password immediately!"
                )
            )
        else:
            self.stdout.write(
                self.style.NOTICE(
                    f'Superuser "{DEFAULT_USERNAME}" already exists — skipping creation.'
                )
            )

        # Create or retrieve the auth token
        token, token_created = Token.objects.get_or_create(user=user)
        self.stdout.write(
            self.style.SUCCESS(f"  Auth Token: {token.key}")
        )
        if token_created:
            self.stdout.write("  (New token generated)")
        else:
            self.stdout.write("  (Existing token retrieved)")
