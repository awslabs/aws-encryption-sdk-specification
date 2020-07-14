[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Encrypt

## Version

0.3.0

### Changelog

- 0.3.0

  - [Clarify Streaming Encrypt and Decrypt](../changes/2020-07-06_clarify-streaming-encrypt-decrypt/change.md)

- 0.2.0

  - [Remove Keyring Trace](../changes/2020-05-13_remove-keyring-trace/change.md)

- 0.1.0-preview

  - Initial record

## Implementations

| Language   | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                                                 |
| ---------- | -------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C          | 0.1.0-preview                          | 0.1.0                     | [session_encrypt.c](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/session_encrypt.c)                                                          |
| NodeJS     | 0.1.0-preview                          | 0.1.0                     | [encrypt.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/encrypt-node/src/encrypt.ts)                                         |
| Browser JS | 0.1.0-preview                          | 0.1.0                     | [encrypt.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/encrypt-browser/src/encrypt.ts)                                      |
| Python     | 0.1.0-preview                          | 1.2.0                     | [streaming_client.py](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/streaming_client.py)                                 |
| Java       | 0.1.0-preview                          | 0.0.1                     | [EncryptionHandler.java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/internal/EncryptionHandler.java) |

## Overview

This document describes the behavior by which a plaintext is encrypted and serialized into a [message](../data-format/message.md).

Any client provided by the AWS Encryption SDK that performs encryption of caller plaintext MUST follow
this specification for encryption.

## Input

The following inputs to this behavior are REQUIRED:

- [Plaintext](#plaintext)
- either a [Cryptographic Materials Manager (CMM)](../framework/cmm-interface.md) or a [Keyring](../framework/keyring-interface.md)

The following as inputs to this behavior are OPTIONAL:

- [Algorithm Suite](#algorithm-suite)
- [Encryption Context](#encryption-context)
- [Frame Length](#frame-length)
- [Plaintext Length](#plaintext-length)

### Plaintext

The plaintext to encrypt.
This MUST be a sequence of bytes.

This input MAY be streamed to this operation.
This means that bytes are made available to this operation sequentially and over time,
and that an end to the input is eventually indicated.
This means that:

- There MUST be a mechanism for input bytes to become available to be processed.
- There MUST be a mechanism to indicate that there are no more input bytes,
  or whether more bytes MAY be made available in the future.

If an implementation requires holding the input entire plaintext in memory in order to perform this operation,
that implementation SHOULD NOT provide an API that allows this input to be streamed.

### Encryption Context

See [encryption context](../framework/structures.md#encryption-context).

The encryption context MUST NOT contain an entry with a [reserved key value](../framework/structures.md#encryption-context).

### CMM

A CMM that implements the [CMM interface](../framework/cmm-interface.md).

### Keyring

A Keyring that implements the [keyring interface](../framework/keyring-interface.md).

### Algorithm Suite

The [algorithm suite](#algorithm-suite.md) that SHOULD be used for encryption.

### Frame Length

The [frame length](../data-format/message-header.md#frame-length) to use for [framed data](../data-format/message-body.md).
This value MUST NOT exceed the value 2^32 - 1.

### Plaintext Length

A bound on the length of the [plaintext](#plaintext) to encrypt.

## Output

This behavior MUST output the following if the behavior is successful:

- [encrypted message](#encrypted-message)

### Encrypted Message

An encrypted form of the input [plaintext](#plaintext),
encrypted according to the [operation specified below](#operation).
This MUST be a sequence of bytes
and conform to the [message format specification](../data-format/message.md).

This operation MAY stream the encrypted message.
This means that output bytes are released sequentially and over time,
and that an end to the output is eventually indicated.
This means that:

- There MUST be a mechanism for output bytes to be released
- There MUST be a mechanism to indicate that the entire output has been released,
  or whether more bytes MAY be released in the future.

If an implementation requires holding the entire input plaintext in memory in order to perform this operation,
that implementation SHOULD NOT provide an API that allows this output to be streamed.

## Behavior

The Encrypt operation is divided into several distinct steps:

- [Get the encryption materials](#get-the-encryption-materials)
- [Construct the header](#construct-the-header)
- [Construct the body](#construct-the-body)
- [Construct the signature](#construct-the-signature)
  - If the [encryption materials gathered](#get-the-encryption-materials) has a algorithm suite
    including a [signature algorithm](../framework/algorithm-suites.md#signature-algorithm),
    this operation MUST perform this step.
    Otherwise this operation MUST NOT perform this step.

This operation MUST perform all the above steps unless otherwise specified,
and it MUST perform them in the above order.

These steps calculate and serialize the components of the output [encrypted message](#encrypted-message).
Any data that is not specified within the [message format](../data-format/message.md)
MUST NOT be added to the output message.

If any of these steps fails, this operation MUST halt and indicate a failure to the caller.

### Get the encryption materials

To construct the [encrypted message](#encrypted-message),
some fields MUST be constructed using information obtained
from a set of valid [encryption materials](../framework/structures.md#encryption-materials).
This operation MUST obtain this set of [encryption materials](../framework/structures.md#encryption-materials)
by calling [Get Encryption Materials](../framework/cmm-interface.md#get-encryption-materials) on a [CMM](../framework/cmm-interface.md).
The CMM used MUST be the input CMM, if supplied.
If instead the caller supplied a [keyring](../framework/keyring-interface.md),
this behavior MUST use a [default CMM](../framework/default-cmm.md)
constructed using the caller supplied keyring as input.
The call to [Get Encryption Materials](../framework/cmm-interface.md#get-encryption-materials)
on that CMM MUST be constructed as follows:

- Encryption Context: If provided, this is the [input encryption context](#encryption-context).
  Otherwise, this is an empty encryption context.
- Algorithm Suite: If provided, this is the [input algorithm suite](#algorithm-suite).
  Otherwise, this field is not included.

The [algorithm suite](../framework/algorithm-suites.md) used in all aspects of this operation
MUST be the algorithm suite in the [encryption materials](../framework/structures.md#encryption-materials)
returned from the [Get Encryption Materials](../framework/cmm-interface.md#get-encryption-materials) call.
Note that the algorithm suite in the retrieved encryption materials MAY be different
from the [input algorithm suite](#algorithm-suite).

The data key used as input for all encryption described below is a data key derived from the plaintext data key
included in the [encryption materials](../framework/structures.md#encryption-materials).
The algorithm used to derive a data key from the plaintext data key MUST be
the [key derivation algorithm](../framework/algorithm-suites.md#key-derivation-algorithm) included in the
[algorithm suite](../framework/algorithm-suites.md) defined above.
This document refers to the output of the key derivation algorithm as the derived data key.
Note that if the key derivation algorithm is the [identity KDF](../framework/algorithm-suites.md#identity-kdf),
then the derived data key is the same as the plaintext data key.

The frame length used in the procedures described below is the input [frame length](#frame-length),
if supplied.
If a frame length is not specified on input, this operation MUST choose a reasonable value to
default to.

### Construct the header

Before encrypting input plaintext, this operation MUST serialize the [message header body](../data-format/message-header.md)
with the following specifics:

- [Version](../data-format/message-header.md#version-1): MUST have a value corresponding to
  [1.0](../data-format/message-header.md#supported-versions)
- [Type](../data-format/message-header.md#type): MUST have a value corresponding to
  [Customer Authenticated Encrypted Data](../data-format/message-header.md#supported-types)
- [Algorithm Suite ID](../data-format/message-header.md#algorithm-suite-id): MUST correspond to
  the [algorithm suite](../framework/algorithm-suites.md) used in this behavior
- [AAD](../data-format/message-header.md#aad): MUST be the serialization of the [encryption context](../framework/structures.md#encryption-context)
  in the [encryption materials](../framework/structures.md#encryption-materials)
- [Encrypted Data Keys](../data-format/message-header.md#encrypted-data-key-entries): MUST be the serialization of the
  [encrypted data keys](../framework/structures.md#encrypted-data-keys) in the [encryption materials](../framework/structures.md#encryption-materials)
- [Content Type](../data-format/message-header.md#content-type): MUST be [02](../data-format/message-header.md#supported-content-types)
- [IV Length](../data-format/message-header.md#iv-length): MUST match the [IV length](../framework/algorithm-suites.md#iv-length)
  specified by the [algorithm suite](../framework/algorithm-suites.md)
- [Frame Length](../data-format/message-header.md#frame-length): MUST be the value of the frame size determined above.

After serializing the message header body,
this operation MUST calculate an [authentication tag](../data-format/message-header.md#authentication-tag)
over the message header body.
The value of this MUST be the output of the [authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
specified by the [algorithm suite](../framework/algorithm-suites.md), with the following inputs:

- The AAD is the serialized [message header body](../data-format/message-header.md#header-body).
- The IV has a value of 0.
- The cipherkey is the derived data key
- The plaintext is an empty byte array

With the authentication tag calculated, this operation MUST serialize the
[message header authentication](../data-format/message-header.md#header-authentication)
with the following specifics.

- [IV](../data-format/message-header.md#iv): MUST have a value of 0,
  padded to the [IV length](../data-format/message-header.md#iv-length).
- [Authentication Tag](../data-format/message-header.md#authentication-tag): MUST have the value
  of the authentication tag calculated above.

Once the entire message header has been authenticated and serialized,
the serialized message header MAY be released.

The encrypted message outputted by this operation MUST have a message header equal
to the message header calculated in this step.

If the algorithm suite contains a signature algorithm and
this operation is streaming the encrypted message output to the caller,
this operation MUST input the serialized header to the signature algorithm as soon as it is serialized,
such that the serialized header isn't required to remain in memory to complete
the [signature calculation](#signature-calculation).

## Construct the body

The encrypted message outputted by this operation MUST have a message body equal
to the message body calculated in this step.

While there MAY still be plaintext left to encrypt,
this operation MUST either wait for more plaintext to become available,
wait for an end to the plaintext to be indicated,
or perform encryption on the available plaintext to construct frames
which make up the message body.

Frames MUST be constructed sequentially such that the concatenation of their decryption
in [sequence number](#.../data-format/message-body.md#sequence-number)
order is equal to the input plaintext which has been encrypted so far.

If more input plaintext MAY become available
and there are not enough input plaintext bytes available to create a new
[regular frame](#../data-format/message-body.md#regular-frame),
then this operation MUST wait until either enough plaintext bytes become available
or the caller indicates an end to the plaintext.

If more input plaintext MAY become available
and there is enough plaintext available to construct a new regular frame,
then this operation MUST [construct a regular frame](#construct-a-frame)
with the available plaintext.

If more input plaintext MUST NOT become available
and there is exactly enough plaintext bytes available to create one regular frame,
then this operation MUST [construct either a final frame or regular frame](#construct-a-frame)
with the remaining plaintext.
If they construct a regular frame, they MUST also construct an empty final frame.

If more input plaintext MUST NOT become available
and there are not enough input plaintext bytes available to create a new regular frame,
then this operation MUST [construct a final frame](#construct-a-frame)
with the remaining plaintext.

### Construct a frame

To construct a regular or final frame that represents the next frame in the encrypted message's body,
this operation MUST calculate encrypted content and an authentication tag using the
[authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
specified by the [algorithm suite](../framework/algorithm-suites.md),
with the following inputs:

- The AAD is the serialized [message body AAD](../data-format/message-body-aad.md),
  constructed as follows:
  - The [message ID](../data-format/message-body-aad.md#message-id) is the same as the
    [message ID](../data-frame/message-header.md#message-id) serialized in the header of this message.
  - The [Body AAD Content](../data-format/message-body-aad.md#body-aad-content) depends on
    whether the thing being encrypted is a regular frame or final frame.
    Refer to [Message Body AAD](../data-format/message-body-aad.md) specification for more information.
  - The [sequence number](../data-format/message-body-aad.md#sequence-number) is the sequence
    number of the frame being encrypted.
    If this is the first frame sequentially, this value MUST be 1.
    Otherwise, this value MUST be 1 greater than the value of the sequence number
    of the previous frame.
  - The [content length](../data-format/message-body-aad.md#content-length) MUST have a value
    equal to the length of the plaintext being encrypted.
    - For a regular frame the length of this plaintext MUST equal the frame length.
    - For a final frame this MUST be the length of the remaining plaintext bytes
      which have not yet been encrypted,
      whose length MUST be equal to or less than the frame length.
- The IV is the [sequence number](../data-format/message-body-aad.md#sequence-number)
  used in the message body AAD above,
  padded to the [IV length](../data-format/message-header.md#iv-length).
- The cipherkey is the derived data key
- The plaintext is the next subsequence of available plaintext bytes that have not yet been encrypted.
  - For a regular frame the length of this plaintext subsequence MUST equal the frame length.
  - For a final frame this MUST be the remaining plaintext bytes which have not yet been encrypted,
    whose length MUST be equal to or less than the frame length.

This operation MUST serialize a regular frame or final frame with the following specifics:

- [Sequence Number](../data-format/message-body.md#sequence-number): MUST be the sequence number of this frame,
  as determined above.
- [IV](../data-format/message-body.md#iv): MUST be the IV used when calculating the encrypted content above
- [Encrypted Content](../data-format/message-body.md#encrypted-content): MUST be the encrypted content calculated above.
- [Authentication Tag](../data-format/message-body.md#authentication-tag): MUST be the authentication tag
  outputted when calculating the encrypted content above.

Once the entire frame is serialized,
the serialized frame MAY be released.

If the algorithm suite contains a signature algorithm and
this operation is streaming the encrypted message output to the caller,
this operation MUST input the serialized frame to the signature algorithm as soon as it is serialized,
such that the serialized frame isn't required to remain in memory to complete
the [signature calculation](#signature-calculation).

### Construct the signature

If the [algorithm suite](../framework/algorithm-suites.md) contains a [signature algorithm](../framework/algorithm-suites.md#signature-algorithm),
this operation MUST calculate a signature over the message,
and the output [encrypted message](#encrypted-message) MUST contain a [message footer](../data-format/message-footer.md).

To calculate a signature, this operation MUST use the [signature algorithm](../framework/algorithm-suites.md#signature-algorithm)
specified by the [algorithm suite](../framework/algorithm-suites.md), with the following input:

- the signature key is the [signing key](../framework/structures.md#signing-key) in the [encryption materials](../framework/structures.md#encryption-materials)
- the input to sign is the concatenation of the serialization of the [message header](../data-format/message-header.md) and [message body](../data-format/message-body.md)

Note that the message header and message body MAY have already been inputted during previous steps.

This operation MUST then serialize a message footer with the following specifics:

- [Signature Length](../data-format/message-footer.md#signature-length): MUST be the length of the
  output of the calculation above.
- [Signature](../data-format/message-footer.md#signature): MUST be the output of the calculation above.

Once the entire message is signed and the message footer is serialized,
the serialized message footer MAY be released.

The encrypted message outputted by this operation MUST have a message footer equal
to the message footer calculated in this step.

## Security Considerations

[TODO]

## Appendix

### Un-Framed Message Body Encryption

Implementations of the AWS Encryption SDK MUST NOT encrypt using the Non-Framed content type.
However, this behavior was supported in the past.

If a message has the [non-framed](../data-format/message-body.md#non-framed-data) content type,
the [message body](../data-format/message-body.md) was serialized with the following specifics:

- [IV](../data-format/message-body.md#iv): MUST be the [sequence number](../data-format/message-body-aad.md#sequence-number)
  used in the [message body AAD](../data-format/message-body-aad.md).
- [Encrypted Content](../data-format/message-body.md#encrypted-content): MUST be the output of the [authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
  specified by the [algorithm suite](../framework/algorithm-suites.md), with the following inputs:
  - The AAD is the serialized [message body AAD](../data-format/message-body-aad.md)
  - The IV is the [IV](../data-format/message-body.md#iv) specified above.
  - The cipherkey is the derived data key
  - The plaintext is the input [plaintext](#plaintext)
- [Authentication Tag](../data-format/message-body.md#authentication-tag): MUST be the authentication tag outputted by the above encryption.
