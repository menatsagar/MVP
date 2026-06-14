from rest_framework.pagination import PageNumberPagination


class DynamicPageSizePagination(PageNumberPagination):
    """
    Pagination class that respects 'page_size' query parameter
    to allow frontend dynamically controlling page size (e.g. page_size=1000).
    """

    page_size_query_param = "page_size"
    max_page_size = 10000
