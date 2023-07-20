[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Interacting with AWS KMS using the AWS Encryption SDK (Background)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Issues and Alternatives

### Why specify concurrency?

We live in a concurrent world.
Almost every piece of code will eventually be used in a multi-threaded context.
At a minimum, any library needs to specify whether or not it can be used
safely with multiple threads. Ideally, that answer will be "yes".

### What changes to the existing CMC are required?

There are two tiers of change required.

_Basic Usability_ : Using the CMC in a multi-threaded context must not introduce new problems.
Basic invariants must be maintained, and spurious errors must be avoided.
These are covered in [basic thread safety](./change.md#basic-thread-safety)
and [PutCacheEntry if key already exists](./change.md#putcacheentry-if-key-already-exists).

_Full Usability_ : Using the CMC in a multi-threaded context must be pleasant and unsurprising,
without any edge cases that would make a service unnecessarily unresponsive.
This is covered in all the other sections of the [change document](./change.md),
and primarily involves avoiding redundant calls, or excessive concurrent calls,
to the backend materials provider,

### API changes

The original interface produces client code of the form

```
if GetCacheEntry(k) == NoSuchEntry
   s := LookupFor(k)
   PutCacheEntry(k, s)
```

Another popular choice has the write process be part of the cache,
produces client code of the form

```
function f(k) := LookupFor(k)
GetCacheEntryOrLookup(f)
```

To prevent lookup storms, the cache needs a way to tell some clients
to perform a lookup, while blocking or giving data to others.
Both of these interfaces can accomplish that.

The original interface is sufficient to implement the full set of thread friendly
features, and is arguably simpler and so no interface change was deemed necessary.
Further, the original interface gives simpler control over what to do if a lookup fails,
as well as being more composable.

### Default Values

Providing default values for
[Grace Period](../../framework/storm-tracking-cryptographic-materials-cache.md#grace-period),
[Grace Interval](../../framework/storm-tracking-cryptographic-materials-cache.md#grace-interval),
[FanOut](../../framework/storm-tracking-cryptographic-materials-cache.md#fanout),
[Inflight TTL](../../framework/storm-tracking-cryptographic-materials-cache.md#inflight-ttl), and
[sleepMilli](../../framework/storm-tracking-cryptographic-materials-cache.md#sleepmilli)
is safe because nothing else in the system needs to coordinate with these value.

The defaults assume the typical use case, where the TTL is many minutes,
and getting new materials takes dozens of milliseconds.

Grace Period : The default of 10 seconds fetches new materials only slightly
sooner than a regular cache, while still providing plenty of time for
a successful lookup before time runs out, preventing both lookup storms and
client blocking.

Grace Interval : The default of one second leaves plenty of time for
successfully getting new materials, while still providing nine retries
before any other clients need to block.

FanOut : 20 network requests in flight at one time seems a reasonable balance
between enough parallelism for good performance and so much parallelism that
performance starts to degrade.

Inflight TTL : 20 seconds is plenty of time to acquire new materials.
If a client hasn't done something in 20 seconds, they're likely to never respond.

sleepMilli : 20 milliseconds is enough time, under normal circumstances,
to get materials once or twice, and short enough not to overly delay processing.

### Grace Period Metrics

Even though cache entries expire only base on an expiration time,
for maximum security, a client must also track number of messages encrypted
and number of bytes encrypted.

Theoretically, the grace period could also kick in as we approach a limit
for the number of bytes or messages; however

1 The design is already quite complex just dealing with time.
1 The cache can know when time passes, but it is the client's responsibility
to track data usage, and so rather large interface changes would be necessary
to handle those factors.
