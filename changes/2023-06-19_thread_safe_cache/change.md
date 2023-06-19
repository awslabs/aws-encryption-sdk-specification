[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Add Thread Safety to Cryptographic Materials Cache Specification

## Affected Specifications

| Specification                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------- |
| [Cryptographic Materials Cache](../../framework/cryptographic-materials-cache.md)                                       |
| Local Cryptographic Materials Cache](../../framework/local-cryptographic-materials-cache.md)                            |
| [Synchronized Local Cryptographic Materials Cache](../../framework/synchronized-local-cryptographic-materials-cache.md) |
| [Storm Tracking Cryptographic Materials Cache](../../framework/storm-tracking-cryptographic-materials-cache.md)         |

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

The [Cryptographic Materials Cache](../../framework/cryptographic-materials-cache.md) interface
and the [Local Cryptographic Materials Cache](../../framework/local-cryptographic-materials-cache.md)
were written with a single-threaded mindset.

Since a cache is, almost by definition, shared across multiple threads, this must be generalized.

## Configuration

Some new configuration is needed

### Grace Period

A number of seconds (at least 2, default 10).

If an entry will expire within this amount of time,
attempts will be made to refresh the cache.

This should be significantly less than the TTL for any item put into the cache.

### Grace Interval

A number of seconds (at least 1, default 1).

While within the [grace period](#grace-period),
attempts to refresh the cache are made no more often than once per interval.

### Lookup Fanout

A number (at least 1, default 20).

The maximum number of individual keys for which lookups can be in flight.

### PutCacheEntry if key already exists

The first change that must be made is to PutCacheEntry.
The spec doesn't explicitly say what to do if there is already an entry for the given key.
In a multi-threaded environment, this situation can't be avoided, as one thread might
call PutCacheEntry right after called GetCacheEntry and found nothing.
The simplest and more useful behavior is for Put to always Put the new thing,
whether or not something was already in the cache under that key.

### Basic Thread Safety

The [Local Cryptographic Materials Cache](../../framework/local-cryptographic-materials-cache.md)
has mutable state and is therefore not thread safe.

[Synchronized Local Cryptographic Materials Cache](../../framework/synchronized-local-cryptographic-materials-cache.md)
is a thin synchronized wrapper around
[Local Cryptographic Materials Cache](../../framework/local-cryptographic-materials-cache.md)
so that all operations are safe under multiple threads,

### Lookup Storms

A more subtle problem with a multi-threaded implementation involves many threads
resolving the same key at the same time. For example, many threads might each look at the cache,
find it empty, and then all make the same call to KMS to fetch a plaintext data key;
which is both slow and expensive.

To ameliorate this, we introduce the
[Storm Tracking Cryptographic Materials Cache](../../framework/storm-tracking-cryptographic-materials-cache.md)
which prevents these storms. This amelioration comes in three parts

#### Expiration Storm

During normal operation, a single cache entry will expire.
It is possible that many threads will notice this at once,
and all of them try to fill the cache with newly acquired data.

To avoid this, we introduce a [grace period](#grace-period) which is a period of time before the expiration
when refilling the cache can begin.

At the beginning of the [grace period](#grace-period), no more than once per [grace interval](#grace-interval),
a client will be told `No Such Entry` even though an entry exists,
with the expectation that this client will fetch new materials and call `PutCacheEntry`,
moving this key out of the [grace period](#grace-period).
All other clients receive the cache entry as usual.

If the cache is not refreshed for this key before the entry expires,
then the entry will expire, and it will be handles as an [initialization storm](#initialization-storm).

In a single threaded context, this results in behavior that is exactly that of the
[Local Cryptographic Materials Cache](../../framework/local-cryptographic-materials-cache.md)
except that the entries expire at the beginning of the grace period, rather than the end.

#### Initialization Storm

On startup, or any other time that there is no entry in the cache,
the [expiration storm](#expiration-storm) strategy can't work,
because there is nothing to return to the other clients.

In this case, one client per [grace interval](#grace-interval) will
receive `NoSuchEntry` as above.
The other clients will block until an entry is available.

#### Multi-Key Storm

[expiration](#expiration-storm) and [initialization](#initialization-storm) storms
only apply to individual keys in isolation.

In the case where there are many different keys in use,
many keys might need refreshing at the same time,
and the other types of storm amelioration won't help.

The number of inflight keys is defined as
the number of keys for which we have returned `No Such Entry`
and for which `PutCacheEntry` has not yet been called.

If `GetCacheEntry` is called, and one of the above amelioration
strategies would otherwise return `No Such Entry`,
we instead return as if the [grace interval](#grace-interval) has
no yet passed, that is, if an unexpired entry exists in the cache we return it,
otherwise we block.
