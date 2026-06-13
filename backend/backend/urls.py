"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", obtain_auth_token, name="api-token-auth"),
    path("api/", include("core.urls")),
    path("api/", include("employees.urls")),
    path("api/", include("salary_bands.urls")),
    path("api/", include("reviews.urls")),
    path("api/", include("audit.urls")),
]
