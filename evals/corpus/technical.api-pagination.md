# Working With Pagination

When it comes to fetching large datasets, pagination is absolutely your best friend. Our API leverages a powerful cursor-based approach that makes it a breeze to page through results efficiently, no matter how much data you're dealing with.

## How Pagination Works

It's important to note that every list endpoint returns a handy "next_cursor" field. Simply grab that cursor and pass it back in your next request, and boom—you'll get the next page of results. Rinse and repeat until the cursor comes back empty, and you'll know you've reached the end.

By default, we return 20 items per page, but you can easily bump that up to a maximum of 100 by setting the limit parameter. Just keep in mind that larger pages obviously take a bit longer to load.