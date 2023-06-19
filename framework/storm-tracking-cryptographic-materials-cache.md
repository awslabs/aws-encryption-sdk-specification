[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Storm Tracking Cryptographic Materials Cache

## Version

### Changelog

- 0.1.0
  - Initial record
  - [Thread Safe Cache](../changes/2023-06-19_thread_safe_cache/change.md)

## Overview

The storm tracking Cryptographic Materials Cache (storm tracking CMC)
is a built-in implementation of the [CMC interface](cryptographic-materials-cache.md)
provided by the AWS Encryption SDK.

It provides thread safe access to a [Local CMC](local-cryptographic-materials-cache.md),
and prevents excessive parallel requests to the underlying cryptographic materials provider.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Initialization

On initialization of the synchronized local CMC,
the caller MUST provide exactly what is required by a
[Local CMC](local-cryptographic-materials-cache.md).

It MAY also provide

- [Grace Period](#grace-period)
- [Grace Interval](#grace-interval)
- [Lookup Fanout](#lookup fanout)

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

## Behaviors

All behaviors MUST be exactly the same as a [Local CMC](local-cryptographic-materials-cache.md),
even if used in a multi-threaded context, with two exceptions

- GetCacheEntry might return NoSuchEntry, even thought there is really an entry
- GetCacheEntry might block for a time before returning a result.

Specifics for these two exceptions are outlines below.

### In Flight

Any time the storm tracking CMC returns NoSuchEntry from GetCacheEntry,
that key is said to `in flight` until that same key is written with PutCacheEntry.

For each in flight key, the storm tracking CMC MUST keep track of the most recent time
that NoSuchEntry was returned, with accuracy to the second.

### PutCacheEntry

PutCacheEntry MUST ensure the key is not in flight.

### GetCacheEntry

If GetCacheEntry is called for a key :

If that key is in the cache but expired, that key must be removed from the cache before further processing.

If that key is in the cache AND that key is not within the [Grace Period](#grace-period)

- GetCacheEntry MUST return the cache entry. It SHOULD be the case that the key is not inflight.

Else If the number of things inflight is greater than or equal to the [Lookup Fanout](#lookup-fanout) THEN

- If the key is in the cache THEN GetCacheEntry MUST return the cache entry.
- Else GetCacheEntry MUST block until some other option is available.

Else if the key is not in the cache THEN

- If the key is in flight AND the current time is within the [the grace interval](#grace-interval) THEN GetCacheEntry MUST block until some other option is available.
- Else GetCacheEntry MUST return NoSuchEntry and mark that key as inflight at the current time.

Else // the key is in the cache, and within the grace period

- If the key is in flight AND the current time is within the [the grace interval](#grace-interval) THEN GetCacheEntry MUST return the cache entry.
- Else GetCacheEntry MUST return NoSuchEntry and mark that key as inflight at the current time.
