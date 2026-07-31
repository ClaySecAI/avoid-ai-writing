# Frequently Asked Questions: Errors

Got questions about errors? You've come to the right place! We've rounded up the questions we hear most often and answered them in plain English. Let's dig in.

## Why am I getting a 401 error?

Great question! Nine times out of ten, a 401 simply means there's something up with your authentication. Maybe your token expired, or maybe it wasn't included in the request at all. Double-check that you're passing your API key in the Authorization header, and you should be golden.

## What's the deal with 500 errors?

Ugh, 500 errors—nobody likes those. The good news is that these are on us, not you. It means something went sideways on our end. If you see one, don't panic! Just retry the request after a short wait, and if it keeps happening, feel free to reach out to our support team. We're always happy to help.

## How do I debug a failed request?

Ah, the age-old question! Our best advice is to start by logging the full response body—it's packed with helpful details about what went wrong. Every error response includes a handy error code and a human-readable message that'll point you in the right direction. From there, it's usually pretty smooth sailing.