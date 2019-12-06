[//]: # (Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.)
[//]: # (SPDX-License-Identifier: CC-BY-SA-4.0)

# Encrypt

## Version

0.1.0-preview

## Implementations

- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/session_encrypt.c)
- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/internal/EncryptionHandler.java)
- [NodeJS](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/encrypt-node/src/encrypt.ts)
- [Browser JS](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/encrypt-browser/src/encrypt.ts)
- [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/streaming_client.py)

## Overview

This document describes the behavior by which a plaintext is encrypted and serialized into a [message](#message.md).

Any client provided by the AWS Encryption SDK that performs encryption of user plaintext MUST follow
this specification for encryption.

## Input

The following inputs to this behavior are REQUIRED:

- [Plaintext](#plaintext)
- either a [Cryptographic Materials Manager (CMM)](cmm-interface.md) or a [Keyring](#keyring-interface.md)

The following as inputs to this behavior are OPTIONAL:

- [Encryption Context](#encryption-context)
- [Frame Length](#frame-length)
- [Plaintext Length](#plaintext-length)

### Plaintext

The plaintext to encrypt.

### Encryption Context

See [encryption context](#structures.md#encryption-context).

The encryption context MUST NOT contain an entry with a [reserved key value](#data-structutes.md#encryption-context).

### CMM

A CMM that implements the [CMM interface](#cmm-interface.md).

### Keyring

A Keyring that implements the [keyring interface](#keyring-interface.md).

### Frame Length

The [frame length](#message-header.md#frame-length) to use for [framed data](#message-body.md).
This value MUST NOT exceed the value 2^32 - 1.

### Plaintext Length

A bound on the length of the [plaintext](#plaintext) to encrypt.

## Output

This behavior MUST output the following if the behavior is successful:

- [message](#message.md)

This behavior MAY output the following:

- [keyring trace](#structures.md#keyring-trace)

To construct the outputs, some fields MUST be constructed using information obtained
from a set of valid [encryption materials](#structures.md#encryption-materials).
This behavior MUST obtain this set of [encryption materials](#structures.md#encryption-materials)
by calling [Get Encryption Materials](#cmm-interface.md#get-encryption-materials) on a [CMM](#cmm-interface.md).
The CMM used MUST be the input CMM, if supplied.
If instead the user supplied a [keyring](#keyring-interface.md), this behavior MUST use a [default CMM](#default-cmm.md),
constructed using the user supplied keyring as input.
The call to [Get Encryption Materials](#cmm-interface.md#get-encryption-materials) MUST include the
input [encryption context](#encryption-context), if supplied.
If the length is known on the input [plaintext](#plaintext), this call MUST also include that value

The [algorithm suite](#algorithm-suites.md) used in all aspects of this behavior MUST be the algorithm suite in the
[encryption materials](#encryption-materials.md) returned from the [Get Encryption Materials](#cmm-interface#get-encryption-materials) call.

The data key used as input for all encryption described below is a data key derived from the plaintext data key
included in the [encryption materials](#data-strucutres.md#encryption-materials).
The algorithm used to derive a data key from the plaintext data key MUST be
the [key derivation algorithm](#algorithm-suites.md#key-derivation-algorithm) included in the
[algorithm suite](#algorithm-suites.md) defined above.
This document refers to the output of the key derivation algorithm as the derived data key.
Note that if the key derivation algorithm is the [identity KDF](#algorithm-suites.md#identity-kdf),
then the derived data key is the same as the plaintext data key.

### Message

The output message MUST be bytes, as specified by the [message format](#message.md).

The [message header](#message-header.md) is serialized with the following specifics:

- [Version](#message-header.md#version): MUST have a value corresponding to [1.0](#message-header.md#supported-versions)
- [Type](#message-header.md#type): MUST have a value corresponding to [Customer Authenticated Encrypted Data](#message.md#supported-types)
- [Algorithm Suite ID](#message-header.md#algorithm-suite-id): MUST be the [algorithm suite](#algorithm-suites.md)
  used in this behavior
- [AAD](#message-header.md#aad): MUST be the serialization of the [encryption context](#structures.md#encryption-context)
  in the [encryption materials](#structures.md#encryption-materials)
- [Encrypted Data Keys](#message-header.md#encrypted-data-key): MUST be the serialization of the
  [encrypted data keys](#structures.md#encrypted-data-keys) in the [encryption materials](#structures.md#encryption-materials)
- [Content Type](#message-header.md#content-type): MUST be `Framed`
- [IV Length](#message-header.md#iv-length): MUST match the [IV length](#algorithm-suites.md#iv-length)
  specified by the [algorithm suite](#algorithm-suites.md)
- [Frame Length](#message-header.md#frame-length): MUST be the same value as the input [frame length](#frame-length),
  if included.
- [IV](#message-header.md#iv): MUST have a value of 0, padded to the [IV length](#message-header.md#iv-length).
- [Authentication Tag](#message-header.md#authentication-tag): MUST be the output of the
  [authenticated encryption algorithm](#algorithm-suites.md#encryption-algorithm)
  specified by the [algorithm suite](#algorithm-suites.md), with the following inputs:
  - The AAD is the serialized [message header body](#message-header.md#header-body)
  - The IV is the [IV specified above](#message-header.md#iv)
  - The cipherkey is the derived data key
  - The plaintext is an empty byte array

Each frame of the [message body](#message-body.md) is serialized with the following specifics:

- [IV](#message-body.md#iv): MUST be the [sequence number](#message-body-aad.md#sequence-number)
  used in the [message body AAD](#message-body-aad.md) for this frame.
- [Encrypted Content](#message-body.md#encrypted-content): MUST be the output of the [authenticated encryption algorithm](#algorithm-suites.md#encryption-algorithm)
  specified by the [algorithm suite](#algorithm-suites.md), with the following inputs:
  - The AAD is the serialized [message body AAD](#message-body-aad.md)
  - The IV is the [IV](#message-body.md#iv) specified for this frame above.
  - The cipherkey is the derived data key
  - The plaintext contains part of the input [plaintext](#plaintext) this frame is encrypting.
- [Authentication Tag](#message-body.md#authentication-tag): MUST be the authentication tag outputted by the above encryption.

If the [algorithm suite](#algorithm-suites.md) contains a [signature algorithm](#algorithm-suites.md#signature-algorithm),
the output [message](#message.md) MUST contain a [message footer](#message-footer.md).
The footer is serialized with the following specifics:

- [Signature](#message-footer.md#signature): MUST be the output of the [signature algorithm](#algorithm-suites.md#signature-algorithm)
  specified by the [algorithm suite](#algorithm-suites.md), with the following input:
  - the signature key is the [signing key](#structures.md#signing-key) in the [encryption materials](#structures.md#encryption-materials)
  - the input to sign is the concatenation of the serialization of the [message header](#message-header) and [message body](#message-body)

Any data that is not specified within the [message format](#message.md) MUST NOT be added to the output message.

### Keyring Trace

The [keyring trace](#structures.md#keyring-trace) obtained from the [encryption materials](#data-structure.md#encryption-materials).

## Security Considerations

[TODO]

## Appendix

### Streaming

TODO: Implementations SHOULD support working with a finite amount of working memory for arbitrarly large plaintext.
If size is not known, how do we set the bounds?

### Un-Framed Message Body Encryption

Implementations of the AWS Encryption SDK MUST not encrypt using the Non-Framed content type.
However, this behavior was supported in the past.

If a message has the [non-framed](#message-body.md#non-framed-data) content type,
the [message body](#message-body.md) was serialized with the following specifics:

- [IV](#message-body.md#iv):  MUST be the [sequence number](#message-body-aad.md#sequence-number)
  used in the [message body AAD](#message-body-aad.md).
- [Encrypted Content](#message-body.md#encrypted-content): MUST be the output of the [authenticated encryption algorithm](#algorithm-suites.md#encryption-algorithm)
  specified by the [algorithm suite](#algorithm-suites.md), with the following inputs:
  - The AAD is the serialized [message body AAD](#message-body-aad.md)
  - The IV is the [IV](#message-body.md#iv) specified above.
  - The cipherkey is the derived data key
  - The plaintext is the input [plaintext message](#plaintext-message)
- [Authentication Tag](#message-body.md#authentication-tag): MUST be the authentication tag outputted by the above encryption.
