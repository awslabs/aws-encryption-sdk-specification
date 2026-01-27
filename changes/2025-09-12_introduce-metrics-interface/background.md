[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Interacting with a Metrics Interface in the AWS Encryption SDK family of products (Background)

## Definitions

- Metrics: Throughout this document and other related documents the word, "metrics" is used extensively.
  For Crypto Tools' libraries metrics means two things.

      1. Measuring application performance, (e.g. api requests, cache performance, latency).
      1. Collecting application information, (e.g. algorithm suite choice, cmm configuration, keyring configuration),
      and either transmitting that information to a specific user defined location or transmitting this
      information with Crypto Tools.

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Issues and Alternatives

Crypto Tools (CT) publishes software libraries. The latest
versions of these libraries have no logging or metrics publishing
to either a local application or to an observability service like AWS CloudWatch.

As client side encryption libraries emitting metrics must be done carefully as
to avoid accidentally leaking any information related to the plaintext that could lead to a
loss of customer trust.

A popular feature request has been for in depth insights into CT libraries. Many customers
ask for suggestions on how to reduce network calls to AWS Key Management Service (AWS KMS) and
followup questions around cache performance.

CT offers solutions to reduce network calls to AWS KMS through the Caching CMM and the AWS KMS Hierarchical Keyring.
Today, there is no CT solution for customers to extract the performance metrics customers are looking for.
This can lead to frustrating debugging sessions and escalations that
could have been resolved with additional information.

Recent customer demand has allowed CT to re-evaluate client side metrics to offer
a better customer experience.

### Issue 1: What will be the default behavior?

As a client-side encryption library CT should be as cautious as possible.
Customers of CT libraries should be in the driver's seat and determine for
themselves if their application could benefit from emitting metrics.
Making that decision for customers can erode customer trust.

For CT to be comfortable with allowing metrics, CT must consider that
this process must not affect the availability of the consumer of the library.

#### Opt-In (recommended)

By not emitting metrics by default existing customer workflows do not change.

This allows customers to test how their applications behave when they start to emit
metrics. Customers can then ask for updates to the implementations
CT provides or customers can go an implement their own interfaces that are fine-tuned
to their use cases.

#### Always

This option implies that CT guarantees that the availability of an application
will not change. Perhaps a bold implication this is ultimately what the customer
will feel like; getting no choice on the matter and opting to not upgrade.
Going from never emitting metrics to always emitting them says to customers
that their application no matter its use case will always benefit from metrics.
Without letting customers make that choice, CT loses hard earned customer trust.

This also forces customers to make a choice, start collecting metrics and pick up
additional updates CT provides or get stuck in a version of the library that will
become unsupported.

Additionally, requiring customers to start emitting metrics
almost certainly guarantees a breaking change across supported libraries.

### Issue 2: Should Data Plane APIs fail if metrics fail to publish?

#### No (recommended)

Metrics publishing must not impact application availability.

CT should allow for a fail-open approach when metrics fail to publish.
This will prevent metric publishing issues from impacting the
core functionality of the application.

CT can consider this a two-way door with initially not attempting to retry
to publish failed metrics and add this functionality later on.

#### Yes

This will become a problem for the libraries and will undoubtedly result
in customer friction and failing adoption rates.
Failing operations due to metrics not being published leaves the availability
of the application to rest on the implementation of the metrics interface.
This should not be the case, metrics should aid the customer application
not restrict it.

### Issue 3: How will customers interact with the libraries to emit metrics?

#### Provide an Interface

Keeping in line with the rest of CT features, a well defined interface with out
of the box implementations should satisfy the feature request.

Out of the box implementations should cover publishing metrics to an
existing observability service like AWS CloudWatch and to the local file system using
a hardened framework for that particular language implementation.
These implementations should offer customers a guide into implementing their own
if they wish to do so.

### Issue 4: Should out of the box solutions be custom implementations

#### No (recommended)

There is no need to reinvent the wheel. Other metric frameworks have solved many
of the issues that are described above, (e.g. handling failing requests, perform
blocking requests to CT libraries, use a separate thread/thread pool that handles
these request). By just providing a wrapper, customers can use the framework they
are most comfortable with.

#### Yes
