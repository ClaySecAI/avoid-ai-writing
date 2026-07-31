# Understanding Rate Limits

Let's be honest—nobody loves hitting a rate limit. But here's the thing: rate limits are actually your friend, and once you wrap your head around how they work, you'll never look at them the same way again. In this guide, we'll dive deep into everything you need to know.

## What Are Rate Limits, Anyway?

At their core, rate limits are simply a way for our API to protect itself from being overwhelmed. Think of it like a bouncer at a club—only so many requests can come in at once. Pretty neat, right? Every plan comes with its own limits, and it's super important to know yours.

The default tier gives you a whopping 100 requests per minute, while our Pro tier bumps that up to a generous 1,000 requests per minute. Enterprise? Well, that's basically unlimited for all intents and purposes.

## Handling Rate Limit Errors

So what happens when you go over? You'll get a 429 response, and honestly, that's totally fine—it's just the API's way of saying "hey, slow down a sec." The response includes a Retry-After header that tells you exactly how long to wait. Just grab that value, wait it out, and you're good to go. Easy peasy!

Our SDK handles all of this for you automatically under the hood, so in most cases you won't even have to think about it. Pretty awesome, huh?