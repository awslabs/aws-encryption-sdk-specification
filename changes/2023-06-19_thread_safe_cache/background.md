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

### API changes

The original interface produces client code of the form

```
if GetCacheEntry(k) == NoSuchEntry
   s := LookupFor(k)
   PutCacheEntry(k, s)
```

Another popular choice produces client code of the form

```
function f(k) := LookupFor(k)
GetCacheEntryOrLookup(f)
```

To prevent lookup storms, the cache needs a way to tell some clients
to perform a lookup, while blocking or giving data to others.
Both of these interfaces can accomplish that.

The original interface is sufficient to implement the full set of thread friendly
features, and is arguably simpler and so no interface change was deemed necessary.
Further, the original interface gives simpler control over what to do if a lookup fails.

### Default Values

Providing default values for Grace Time, Grace Interval and FanOut
is safe because nothing else in the system needs to coordinate with these value.

The defaults assume the typical use case, where the TTL is many minutes,
and getting new materials takes dozens of milliseconds.

Grace Time : The default of 10 seconds fetches new materials only slightly
sooner than a regular cache, while still providing plenty of time for
a successful lookup before time runs out, preventing both lookup storms and
client blocking.

Grace Interval : The default of one second leaves plenty of time for
successfully getting new materials, while still providing nine retries
before any other clients need to block.

FanOut : 20 network requests in flight at one time seems a reasonable balance
between enough parallelism for good performance and so much parallelism that
performance starts to degrade.

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
