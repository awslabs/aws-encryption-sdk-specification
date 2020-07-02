[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Clarify Streaming Encrypt and Decrypt

## Affected Features

This change affects no features.

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                           |
| --------------------------------------- |
| [Encrypt](../../client-apis/encrypt.md) |
| [Decrypt](../../client-apis/decrypt.md) |

## Affected Implementations

This change affects no implementations.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

We specify how to perform encryption and decryption in
the streaming context,
specifically specifying what processing MUST occur when,
and what conditions are REQUIRED before releasing output.

## Out of Scope

Any feature updates are out of scope for this change.

## Motivation

The Encrypt and Decrypt specifications do not currently make it clear how these operations
MUST be performed in order to support streaming use cases.
This change clarifies how to operate on partial data
and what conditions are REQUIRED to release output.

## Drawbacks

There SHOULD be no drawbacks for specifying the streaming use case.

## Security Implications

There SHOULD be no security implications for specifying the streaming use case.

## Operational Implications

There SHOULD be no operational implications for specifying the streaming use case.

## Guide-level Explanation

The following sections describe how this change is updating the specification
to answer important questions.

### How should the operation process data in parts?

This change rewites these specifications to
better specify how these operations are allowed to process data in parts.
Specifically, we attempt to be completely language agnostic and frame streaming as a way for
bytes to move sequentially, over time.

With this framing, the things the encrypt and decrypt operations care about are:

- Is the caller allowed to send any more data?
- What data is currently available to me?

In the context of the encrypt or decrypt operation, we specify the conditions
for when the operation MAY or MUST perform some processing.
These conditions include how many input bytes are avaiable,
whether more bytes MAY be available,
at what step in the operation you are in,
and the result of various calculations.

Additionally, we use similar conditions to specify when the output of the operation MAY be released.

This change SHOULD NOT introduce any language which is implementation specific for
a specific streaming interface.
Any streaming interface which is capable of moving bytes over time from one place to another,
and is able to indicate EOF MUST be able to implement this specification as written.

### How should verification and signing be performed?

In order to not require holding the entire message in memory to either create
or verify a signature, this change specifies that streaming use cases input the message
to the signature algorithm in parts, as it is being parsed or serialized.

As such, this change states that once the header or a frame is serialized or parsed,
it MUST be inputted to the signature algorithm (if included) such that it
isn't required to remain in memory for the duration of the operation.

### How and when should plaintext be released?

For one-shot cases,
where the entire message is available in memory,
it is obvious that the operation MUST NOT release any plaintext until the
signature (if included) is verified.

For the streaming case, this gets more complicated.
Streaming is a way to operate on large messages without requiring the entire message to be
loaded into memory.
This allows the processing of arbitrarily long messages with finite memory.
However, when processing messages with a signature,
the operation obtains plaintext in parts as it processes the message,
but has no way of knowing whether the message is verified until the end of the operation.
So what should we do with the unverified plaintext decrypted thus far?
Because streaming is being used, we MUST NOT buffer the entire plaintext,
as that would defeat the point of streaming.
Thus, the plaintext needs to go somewhere other than memory.
Because this is a client-side library, we MUST give it to the customer.

In the case of any decryption failure,
the operation MUST zero out any avilable but unreleaed plaintext.
The customer MUST understand that all released plaintext is unverified until the operation
completes and succeeds.
The customer MUST discard any released plaintext if the operation fails, and MUST roll back
any processing done with that released plaintext.
This change states these security considerations.

We should consider improvements to the format to further reduce or eliminate the need to release
unverified plaintext in the streaming use case, however that is outside the scope of this document.

### How and when does the encryption context become available?

In the one-shot case, the operation MUST verify the whole message before outputting the encryption
context.

In the streaming case, the opeartion MAY release the encryption context before the message is verified,
but it MUST be interpreted as unverified data.

This is important to release because a common use case for the encryption context is
to check the data within it in order to ensure that the correct thing is being decrypted.

Requiring customers to make such a check after already performing decryption on a large message
could be very expensive, when they could instead immediately see possibly unexpected data within
the encryption context.

This change specifies the encryption context as an output, and makes these security considerations
clear.

## Reference-level Explanation

The only changes needed are to the specification,
described by the section above.
