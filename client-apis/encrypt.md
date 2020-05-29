[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Encrypt

## Version

0.2.0

### Changelog

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

Any client provided by the AWS Encryption SDK that performs encryption of user plaintext MUST follow
this specification for encryption.

## Input

The following inputs to this behavior are REQUIRED:

- [Plaintext](#plaintext)
- either a [Cryptographic Materials Manager (CMM)](../framework/cmm-interface.md) or a [Keyring](../framework/keyring-interface.md)

The following as inputs to this behavior are OPTIONAL:

- [Encryption Context](#encryption-context)
- [Frame Length](#frame-length)
- [Plaintext Length](#plaintext-length)

### Plaintext

The plaintext to encrypt.

### Encryption Context

See [encryption context](../framework/structures.md#encryption-context).

The encryption context MUST NOT contain an entry with a [reserved key value](../framework/structures.md#encryption-context).

### CMM

A CMM that implements the [CMM interface](../framework/cmm-interface.md).

### Keyring

A Keyring that implements the [keyring interface](../framework/keyring-interface.md).

### Frame Length

The [frame length](../data-format/message-header.md#frame-length) to use for [framed data](../data-format/message-body.md).
This value MUST NOT exceed the value 2^32 - 1.

### Plaintext Length

A bound on the length of the [plaintext](#plaintext) to encrypt.

## Output

This behavior MUST output the following if the behavior is successful:

- [message](../data-format/message.md)

To construct the outputs, some fields MUST be constructed using information obtained
from a set of valid [encryption materials](../framework/structures.md#encryption-materials).
This behavior MUST obtain this set of [encryption materials](../framework/structures.md#encryption-materials)
by calling [Get Encryption Materials](../framework/cmm-interface.md#get-encryption-materials) on a [CMM](../framework/cmm-interface.md).
The CMM used MUST be the input CMM, if supplied.
If instead the user supplied a [keyring](../framework/keyring-interface.md), this behavior MUST use a [default CMM](../framework/default-cmm.md),
constructed using the user supplied keyring as input.
The call to [Get Encryption Materials](../framework/cmm-interface.md#get-encryption-materials) MUST include the
input [encryption context](#encryption-context), if supplied.
If the length is known on the input [plaintext](#plaintext), this call MUST also include that value

The [algorithm suite](../framework/algorithm-suites.md) used in all aspects of this behavior MUST be the algorithm suite in the
[encryption materials](../framework/structures.md#encryption-materials) returned from the [Get Encryption Materials](../framework/cmm-interface.md#get-encryption-materials) call.

The data key used as input for all encryption described below is a data key derived from the plaintext data key
included in the [encryption materials](../framework/structures.md#encryption-materials).
The algorithm used to derive a data key from the plaintext data key MUST be
the [key derivation algorithm](../framework/algorithm-suites.md#key-derivation-algorithm) included in the
[algorithm suite](../framework/algorithm-suites.md) defined above.
This document refers to the output of the key derivation algorithm as the derived data key.
Note that if the key derivation algorithm is the [identity KDF](../framework/algorithm-suites.md#identity-kdf),
then the derived data key is the same as the plaintext data key.

### Message

The output message MUST be bytes, as specified by the [message format](../data-format/message.md).

The [message header](../data-format/message-header.md) is serialized with the following specifics:

- [Version](../data-format/message-header.md#version-1): MUST have a value corresponding to [1.0](../data-format/message-header.md#supported-versions)
- [Type](../data-format/message-header.md#type): MUST have a value corresponding to [Customer Authenticated Encrypted Data](../data-format/message-header.md#supported-types)
- [Algorithm Suite ID](../data-format/message-header.md#algorithm-suite-id): MUST be the [algorithm suite](../framework/algorithm-suites.md)
  used in this behavior
- [AAD](../data-format/message-header.md#aad): MUST be the serialization of the [encryption context](../framework/structures.md#encryption-context)
  in the [encryption materials](../framework/structures.md#encryption-materials)
- [Encrypted Data Keys](../data-format/message-header.md#encrypted-data-key-entries): MUST be the serialization of the
  [encrypted data keys](../framework/structures.md#encrypted-data-keys) in the [encryption materials](../framework/structures.md#encryption-materials)
- [Content Type](../data-format/message-header.md#content-type): MUST be [02](../data-format/message-header.md#supported-content-types)
- [IV Length](../data-format/message-header.md#iv-length): MUST match the [IV length](../framework/algorithm-suites.md#iv-length)
  specified by the [algorithm suite](../framework/algorithm-suites.md)
- [Frame Length](../data-format/message-header.md#frame-length): MUST be the same value as the input [frame length](#frame-length),
  if included.
- [IV](../data-format/message-header.md#iv): MUST have a value of 0, padded to the [IV length](../data-format/message-header.md#iv-length).
- [Authentication Tag](../data-format/message-header.md#authentication-tag): MUST be the output of the
  [authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
  specified by the [algorithm suite](../framework/algorithm-suites.md), with the following inputs:
  - The AAD is the serialized [message header body](../data-format/message-header.md#header-body)
  - The IV is the [IV specified above](../data-format/message-header.md#iv)
  - The cipherkey is the derived data key
  - The plaintext is an empty byte array

Each frame of the [message body](../data-format/message-body.md) is serialized with the following specifics:

- [IV](../data-format/message-body.md#iv): MUST be the [sequence number](../data-format/message-body-aad.md#sequence-number)
  used in the [message body AAD](../data-format/message-body-aad.md) for this frame.
- [Encrypted Content](../data-format/message-body.md#encrypted-content): MUST be the output of the [authenticated encryption algorithm](../framework/algorithm-suites.md#encryption-algorithm)
  specified by the [algorithm suite](../framework/algorithm-suites.md), with the following inputs:
  - The AAD is the serialized [message body AAD](../data-format/message-body-aad.md)
  - The IV is the [IV](../data-format/message-body.md#iv) specified for this frame above.
  - The cipherkey is the derived data key
  - The plaintext contains part of the input [plaintext](#plaintext) this frame is encrypting.
- [Authentication Tag](../data-format/message-body.md#authentication-tag): MUST be the authentication tag outputted by the above encryption.

If the [algorithm suite](../framework/algorithm-suites.md) contains a [signature algorithm](../framework/algorithm-suites.md#signature-algorithm),
the output [message](../data-format/message.md) MUST contain a [message footer](../data-format/message-footer.md).
The footer is serialized with the following specifics:

- [Signature](../data-format/message-footer.md#signature): MUST be the output of the [signature algorithm](../framework/algorithm-suites.md#signature-algorithm)
  specified by the [algorithm suite](../framework/algorithm-suites.md), with the following input:
  - the signature key is the [signing key](../framework/structures.md#signing-key) in the [encryption materials](../framework/structures.md#encryption-materials)
  - the input to sign is the concatenation of the serialization of the [message header](../data-format/message-header.md) and [message body](../data-format/message-body.md)

Any data that is not specified within the [message format](../data-format/message.md) MUST NOT be added to the output message.

## Security Considerations

[TODO]

## Appendix

### Streaming

TODO: Implementations SHOULD support working with a finite amount of working memory for arbitrarly large plaintext.
If size is not known, how do we set the bounds?

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
