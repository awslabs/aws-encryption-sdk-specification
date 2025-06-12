[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Storm Tracking Cryptographic Materials Cache

## Version

### Changelog

- 0.2.0

  - Add Time Units
  - Clarify Inflight TTL and Grace Interval

- 0.1.0
  - Initial record
  - [Thread Safe Cache](../changes/2023-06-19_thread_safe_cache/change.md)

## Overview

The storm tracking Cryptographic Materials Cache (storm tracking CMC)
is a built-in implementation of the [CMC interface](cryptographic-materials-cache.md)
provided by the AWS Encryption SDK.

It provides thread safe access to a [Local CMC](local-cryptographic-materials-cache.md),
prevents excessive parallel requests to the underlying cryptographic materials provider,
and prevents redundant requests to the underlying cryptographic materials provider for the same key.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Initialization

On initialization of the storm tracking CMC,
the caller MUST provide exactly what is required by a
[Local CMC](local-cryptographic-materials-cache.md).

Initialization MUST also provide

- [Grace Period](#grace-period)
- [Grace Interval](#grace-interval)
- [FanOut](#fanout)
- [Inflight TTL](#inflight-ttl)
- [sleepMilli](#sleepmilli)

Initialization MUST optionally accept the following values:

- [timeUnits](#time units)

The implementation MUST instantiate a [Local CMC](local-cryptographic-materials-cache.md)
to do the actual caching.

### Grace Period

A number of seconds (at least 1, default 10).

If an entry will expire within this amount of time,
attempts will be made to refresh the cache.

This should be significantly less than the TTL for any item put into the cache.

The Grace Period should be at least a few times larger than the Grace Interval,
so that if something goes wrong with the first request, a second or third request will be made.

### Grace Interval

A number of seconds (at least 1, default 1).

An entry that has been in flight for this long is no longer considered in flight.

While within the [grace period](#grace-period), after this period another request is made.

While doing the initial fetch for a key, after this period another request is made.

The Grace Interval should be larger than the longest time expected for a request to the underlying cryptographic materials provider.

### FanOut

A number (at least 1, default 20).

The maximum number of individual keys for which lookups can be in flight.

Other requests are blocked until the number of outstanding requests drops below this number,
or until the amount of time that request has been outstanding exceeds the [Inflight TTL](#inflight-ttl)Inflight TTL.

### Inflight TTL

A number (at least 1, default 20).

A request that has been in flight for this long returns an "InFlightTTL exceeded" error.

If a thread has been sleeping because other threads are allegedly working on the same key,
give up and return an error after this amount of time.

The Inflight TTL should be at least a few times larger than the Grace Interval,
so that if something goes wrong with the first request, a second or third request will be made.

### SleepMilli

A number of milliseconds (at least 1, default 20).

If the implementation must block, and no more intelligent signaling is used,
then the implementation should sleep for this many milliseconds before
reexamining the state of the cache.

SleepMilli MUST NOT be affected by [timeUnits](#time units)

### Time Units

Time Units MUST be either `Seconds` or `Milliseconds` and applies to

- [Grace Period](#grace-period)
- [Grace Interval](#grace-interval)
- [Inflight TTL](#inflight-ttl)

If unset, or set to `Seconds`, the above values MUST be interpreted as seconds.

If set to `Milliseconds`, the above values MUST be interpreted as milliseconds.

## Consistency

The settings need to be consistent.

Here are examples of ambiguous or inconsistent settings:

- A grace interval that exceeds the grace period is inconsistent because only one attempt is made per grace interval and the grace period will end before the next interval.
- An in flight TTL that exceeds the grace period is inconsistent because the grace period will expire before the in flight TTL.
- An in flight TTL that is less than the grace interval is inconsistent because only one attempt is made per grace interval and even if the in flight TTL expires before the interval another attempt should not start.

Therefore

- The [Grace Interval](#grace-interval) MUST be less than or equal to the [Grace Period](#grace-period).
- The [Inflight TTL](#inflight-ttl) MUST be less than or equal to the [Grace Period](#grace-period).
- The [Grace Interval](#grace-interval) MUST be less than or equal to the [Inflight TTL](#inflight-ttl).

For most purposes, the [Grace Period](#grace-period) should be several times larger than the [Grace Interval](#grace-interval).

## Behaviors

The interface MUST be exactly the same as a [Local CMC](local-cryptographic-materials-cache.md),
even if used in a multi-threaded context, with two exceptions

- GetCacheEntry might return NoSuchEntry, even though there is really an entry.
- GetCacheEntry might block for a time before returning a result.

Specifics for these two exceptions are outlined below.

### In Flight

Any time the storm tracking CMC returns NoSuchEntry from GetCacheEntry,
that key is said to be `in flight` until that same key is written with PutCacheEntry.

For each in flight key, the storm tracking CMC MUST keep track of the most recent time
that NoSuchEntry was returned, with accuracy to the second.

### PutCacheEntry

PutCacheEntry MUST mark the key as not in flight.

### Within Grace Period

A time `now` MUST be considered within the [grace period](#grace-period) for an entry that expires
at a time `expiry` if `(expiry - gracePeriod) <= now`

### Within Grace Interval

A time `now` MUST be considered within the [grace interval](#grace-interval)
of an inflight entry at `inflight` time
if `now < (inflight + graceInterval)`

### GetCacheEntry

If GetCacheEntry is called for a key :

The implementation MUST call the [Local CMC](local-cryptographic-materials-cache.md)
to find the cached materials for the key, if any.

If the key **is** found in the cache, it is returned,
unless the current time is [within the grace period](#within-grace-period),
and no other thread is currently fetching new materials. Specifically --

- If the number of things inflight is greater than or equal to the [FanOut](#fanout)
  GetCacheEntry MUST return the cache entry.

- If the key's expiration _is not_ [within the grace period](#within-grace-period),
  GetCacheEntry MUST return the cache entry.

- If the key's expiration _is_ [within the grace period](#within-grace-period),
  and the key _is not_ inflight
  GetCacheEntry MUST return NoSuchEntry and mark that key as inflight at the current time.

- If the key's expiration _is_ [within the grace period](#within-grace-period),
  and the key _is_ inflight
  and the inflight time _is_ [within the grace interval](#within-grace-interval)
  GetCacheEntry MUST return the cache entry.

- If the key's expiration _is_ [within the grace period](#within-grace-period),
  and the key _is_ inflight
  and the inflight time _is not_ [within the grace interval](#within-grace-interval)
  GetCacheEntry MUST return NoSuchEntry and update the key as inflight at the current time.

If the key is **not** found in the cache,
one thread receives NoSuchEntry, while others are blocked until an entry appears. Specifically --

- If the number of things inflight is greater than or equal to the [FanOut](#fanout)
  GetCacheEntry MUST block until a [FanOut](#fanout) slot is available, or the key appears in the cache.

- If the key _is not_ inflight
  GetCacheEntry MUST return NoSuchEntry and mark that key as inflight at the current time.

- If the key _is_ inflight
  and the time spent so far exceeds the [Inflight TTL](#inflight-ttl), the operation MUST fail.

- If the key _is_ inflight
  and the current time _is_ [within the grace interval](#within-grace-interval)
  GetCacheEntry MUST block until a [FanOut](#fanout) slot is available, or the key appears in the cache.

- If the key _is_ inflight
  and the current time _is not_ [within the grace interval](#within-grace-interval)
  GetCacheEntry MUST return NoSuchEntry and update the key as inflight at the current time.
