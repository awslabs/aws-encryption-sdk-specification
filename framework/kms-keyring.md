// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. // SPDX-License-Identifier: CC-BY-SA-4.0

# KMS Keyring

## Version

0.1.0-preview

## Implementations

- [C (KMS keyring implementation in C++)](https://github.com/aws/aws-encryption-sdk-c/blob/master/aws-encryption-sdk-cpp/source/kms_keyring.cpp)
- [Javascript](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/kms-keyring/src/kms_keyring.ts)

## Overview

A keyring which interacts with AWS Key Management Service (KMS) to create, encrypt, and decrypt data keys
using KMS defined Customer Master Keys (CMKs).

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

#### KMS Client

A client which implements the following APIs:

- [KMS GenerateDataKey](#kms-generatedatakey)
- [KMS Encrypt](#kms-encrypt)
- [KMS Decrypt](#kms-decrypt)

### KMS GenerateDataKey

A KMS API for generating a unique data key, and encrypting that data key under a specified CMK.

See [AWS Documentation](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html).

### KMS Encrypt

A KMS API for encrypting plaintext under a specified CMK.

See [AWS Documentation](https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html).

### KMS Decrypt

A KMS API for decrypting ciphertext previously encrypted by [GenerateDataKey](#kms-generatedatakey) or [Encrypt](#kms-encrypt).

See [AWS Documenetation](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html).

## Inputs

On keyring initialization, a keyring MUST define the following:

- [Client Supplier](#client-supplier)

On keyring initialization, a keyring MAY define the following:

- [Key IDs](#key-ids)
- [Generator](#generator)
- [Grant Tokens](#grant-tokens)

### Client Supplier

A function that returns a KMS client that can make the following API calls in a particular AWS region:

- [GenerateDataKey](#kms-generate-data-key)
- [Encrypt](#kms-encrypt)
- [Decrypt](#kms-decrypt)

The keyring will use this client supplier to determine the KMS client to use when making KMS calls.

### Key IDs

Key IDs is a list of strings identifying KMS CMKs, in ARN format.
This list identifies the CMKs to be used for data key encryption and decryption with this keyring.

Each Key ID MUST be one of the following:

- A CMK [alias](https://docs.aws.amazon.com/kms/latest/developerguide/programming-aliases.html) (e.g. "alias/MyCryptoKey")
- A well-formed key ARN (e.g. arn:aws:kms:us-east-1:999999999999:key/01234567-89ab-cdef-fedc-ba9876543210)
- A well-formned alias ARN (e.g. arn:aws:kms:us-east-1:999999999999:alias/MyCryptoKey)

See [AWS Documentation](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html#arn-syntax-kms).

Note that only key IDs in the key ARN format will ever be used for decryption.
This is because encrypted data keys constructed by the KMS keyring will always store the ID of the
CMK used to encrypt it in key ARN format, and [OnDecrypt](#ondecrypt) checks the key ID against that
value before attempting decryption.

The KMS CMK specified by the generator MUST have
[kms:Encrypt](https://docs.aws.amazon.com/kms/latest/developerguide/kms-api-permissions-reference.html#AWS-KMS-API-Operations-and-Permissions)
permissions.

### Generator

A string that identifies a KMS CMK responsible for generating a data key, as well as encrypting and
decrypting data keys.
The string MUST be one of the following:

- A CMK [alias](https://docs.aws.amazon.com/kms/latest/developerguide/programming-aliases.html) (e.g. "alias/MyCryptoKey")
- A well-formed key ARN (e.g. arn:aws:kms:us-east-1:999999999999:key/01234567-89ab-cdef-fedc-ba9876543210)
- A well-formned alias ARN (e.g. arn:aws:kms:us-east-1:999999999999:alias/MyCryptoKey)

See [AWS Documentation](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html#arn-syntax-kms).

Note that only key IDs in the key ARN format will ever be used for decryption.
This is because encrypted data keys constructed by the KMS keyring will always store the ID of the
CMK used to encrypt it in key ARN format, and [OnDecrypt](#ondecrypt) checks the key ID against that
value before attempting decryption.

The generator SHOULD NOT be included in the [key IDs](#key-ids), otherwise this CMK will be used
twice to encrypt the plaintext data key.

The KMS CMK specified by the generator MUST have
[kms:GenerateDataKey](https://docs.aws.amazon.com/kms/latest/developerguide/kms-api-permissions-reference.html#AWS-KMS-API-Operations-and-Permissions)
permissions.

### Grant Tokens

A list of string grant tokens to be included in all KMS calls.

See [AWS Documentation](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token)
for how KMS uses grant tokens.

## Derived Properties

The following is a derived property of the KMS-keyring:

- [Is Discovery](#is-discovery)

### Is Discovery

Indicates whether this keyring is a discovery keyring.
Discovery keyrings do not perform encryption, and on decryption will attempt to decrypt every inputted
[encrypted data key](#structures.md) if the client supplier return a client.

If this keyring has defined a [generator](#generator) or [key IDs](#key-ids), this value MUST be false.
Otherwise, this value MUST be true.

If this value is true, the keyring MUST only ever call [KMS Decrypt](#kms-decrypt).

## Operation

### OnEncrypt

OnEncrypt MUST take [encryption materials](#structures.md#encryption-materials) as input.

If this keyring is a [discovery keyring](#is-discovery), OnEncrypt MUST return the input
[encryption materials](#structures.md#encryption-materials) unmodified.

If the input [encryption materials](#structures.md#encryption-materials) do not contain a plaintext data key
and this keyring does not have a [generator](#generator) defined,
OnEncrypt MUST not modify the [encryption materials](#structures.md#encryption-materials.md)
and MUST fail.

If the input [encryption materials](#structures.md#encryption-materials) do not contain a plaintext data key
and this keyring has a [generator](#generator) defined, and onEncrypt MUST attempt to generate a new plaintext data key
and encrypt that data key by calling [KMS GenerateDataKey](#kms-generatedatakey).

The [KMS client](#kms-client) that calls [KMS GenerateDataKey](#kms-generatedatakey) MUST be the
client returned by the [client supplier](#client-supplier).
The client MUST be a client that calls the AWS region specified in the [generator](#generator) ARN.
If the [client supplier](#client-supplier) does not provide any client for the given region for this GenerateDataKey call,
OnEncrypt MUST fail.

When calling [KMS GenerateDataKey](#kms-generatedatakey), the keyring MUST call with a request constructed as follows:

- `KeyId`: this keyring's [generator](#generator).
- `NumberOfBytes`: the [key derivation input length](#algorithm-suites.md#key-derivation-input-length)
  specified by the [algorithm suite](#algorithm-suites.md) included in the input [encryption materials](#structures.md#encryption-materials).
- `EncryptionContext`: the [encryption context](#structures.md#encryption-context) included in
   the input [encryption materials](#structures.md#encryption-materials).
- `GrantTokens`: this keyring's [grant tokens](#grant-tokens)

If the call to [KMS GenerateDataKey](#kms-generatedatakey) does not succeed, OnEncrypt MUST NOT
modify the [encryption materials](#structures.md#encryption-materials) and MUST fail.

If the call succeeds, OnEncrypt MUST verify that the response `Plaintext` length matches the specification
of the [algorithm suite](#algorithm-suites.md).
If it does not, OnEncrypt MUST fail.
If verified, OnEncrypt MUST do the following with the response from [KMS GenerateDataKey](#kms-generatedatakey):

- set the plaintext data key on the [encryption materials](#structures.md#encryption-materials)
  as the response `Plaintext`.
- append a new [encrypted data key](#structures.md#encrypted-data-key) to the encrypted data key list
  in the [encryption materials](#structures.md#encryption-materials), constructed as follows:
  - the [ciphertext](#structures.md#ciphertext) is the response `CiphertextBlob`.
  - the [key provider id](#structures.md#key-provider-id) is "aws-kms".
  - the [key provider information](#data-strucures.md#key-provider-information) is the response `KeyId`.
- append a new [record](#structures.md#record) to the [keyring trace](#structures.md#keyring-trace)
  in the input [encryption materials](#structures.md#encryption-materials), constructed as follows:
  - The string field KeyNamespace contains "aws-kms".
  - The string field KeyName contains [generator](#generator).
  - The [flags](#structures.md$flags) field of this record includes exactly the following flags:
    - [GENERATED DATA KEY](#structures.md#supported-flags)
    - [ENCRYPTED DATA KEY](#structures.md#supported-flags)
    - [SIGNED ENCRYPTION CONTEXT](#structures.md#supported-flags)

Given a plaintext data key in the [encryption materials](#structures.md#encryption-materials),
OnEncrypt MUST attempt to encrypt the plaintext data key using each CMK specified in it's [key IDs](#key-ids) list.

If this keyring's [generator](#generator) is defined and was not used to [generate a data key](#kms-generatedatakey)
as described above, OnEncrypt MUST also attempt to encrypt the plaintext data key using the CMK specified by the [generator](#generator).

To attempt to encrypt the plaintext data key with a particular CMK, OnEncrypt MUST call [KMS Encrypt](#kms-encrypt).

The [KMS client](#kms-client) that calls [KMS Encrypt](#kms-encrypt) MUST be the
client returned by the [client supplier](#client-supplier).
The client MUST be a client that calls the AWS region specified in the [generator](#generator) ARN.
If the [client supplier](#client-supplier) does not provide any client for the given region for this Encrypt call,
OnEncrypt MUST skip that particular CMK.

To encrypt the plaintext data key with a CMK, OnEncrypt MUST call [KMS Encrypt](#encrypt) with a request
constructed as follows:

- `KeyId`: the CMK ARN to be used for data key encryption.
- `PlaintextDataKey`: the plaintext data key in the [encryption materials](#structures.md#encryption-materials).
- `EncryptionContext`: the [encryption context](#structures.md#encryption-context) included in
  the input [encryption materials](#structures.md#encryption-materials).
- `GrantTokens`: this keyring's [grant tokens](#grant-tokens)

If the call to [KMS Encrypt](#kms-encrypt) does not succeed OnEncrypt MUST fail.

If the call succeeds, OnEncrypt MUST do the following with the response from [KMS Encrypt](#kms-encrypt):

- append a new [encrypted data key](#structures.md#encrypted-data-key) to the encrypted data key list
  in the [encryption materials](#structures.md#encryption-materials), constructed as follows:
  - The [ciphertext](#structures.md#ciphertext) is the response `CiphertextBlob`.
  - The [key provider id](#structures.md#key-provider-id) is "aws-kms".
  - The [key provider information](#data-strucures.md#key-provider-information) is the response `KeyId`.
    Note that the `KeyId` in the response is always in key ARN format.
- append a new [record](#structures.md#record) to the [keyring trace](#structures.md#keyring-trace)
  in the input [encryption materials](#structures.md#encryption-materials), constructed as follows:
  - The string field KeyNamespace contains "aws-kms".
  - The string field KeyName contains [generator](#generator).
  - The [flags](#structures.md$flags) field of this record includes exactly the following flags:
    - [ENCRYPTED DATA KEY](#structures.md#supported-flags)
    - [SIGNED ENCRYPTION CONTEXT](#structures.md#supported-flags)

If all Encrypt calls succeed, OnEncrypt MUST output the modified [encryption materials](#structures.md#encryption-materials).

### OnDecrypt

OnDecrypt MUST take [decryption materials](#structures.md#decryption-materials) and
a list of [encrypted data keys](#structures.md#encrypted-data-keys) as input.

The set of [encrypted data keys](#structures.md#encrypted-data-keys) that OnDecrypt MUST attempt
to decrypt depends on if this keyring is a [discovery keyring](#discovery) or not.

If this keyring is a [discovery keyring](#discovery), OnDecrypt MUST attempt to decrypt every
[encrypted data key](#structures.md#encrypted-data-key) in the input encrypted data key list
with the following conditions, until it successfully decrypts one:

- the [key provider ID](#structures.md#key-provider-id) field has the value "aws-kms"

Otherwise, OnDecrypt MUST attempt to decrypt each input [encrypted data key](#structures.md#encrypted-data-key)
in the input encrypted data key list with the following conditions, until it successfully decrypts one:

- the [key provider ID](#structures.md#key-provider-id) field has the value "aws-kms"
- the [key provider info](#structures.md#key-provider-info) has a value equal to one of the
  ARNs in this keyring's [key IDs](#key-ids) or the [generator](#generator).

To attempt to decrypt a particular [encrypted data key](#structures.md#encrypted-data-key),
OnDecrypt MUST call [KMS Decrypt](#kms-decrypt).

The [KMS client](#kms-client) that calls [KMS Decrypt](#kms-decrypt) MUST be the
client returned by the [client supplier](#client-supplier).
The client MUST be a client that calls the AWS region specified in the [generator](#generator) ARN.
If the [client supplier](#client-supplier) does not provide any client for the given region for the Decrypt call,
OnDecrypt MUST skip that particular [encrypted data key](#encrypted-data-key).

When calling [KMS Decrypt](#kms-decrypt), the keyring MUST call with a request constructed as follows:

- `CiphertextBlob`: the [encrypted data key ciphertext](#structures.md#ciphertext).
- `EncryptionContext`: the [encryption context](#structures.md#encryption-context) included in
  the input [decryption materials](#structures.md#decryption-materials).
- `GrantTokens`: this keyring's [grant tokens](#grant-tokens)

If the call to [KMS Decrypt](#kms-decrypt) does not succeed OnDecrypt MUST continue and attempt to
decrypt the remaining [encrypted data keys](#structures.md#encrypted-data-keys).

If the `KeyId` field in the response from [KMS Decrypt](#kms-decrypt) does not have a value equal to
the [encrypted data key's key provider info](##structures.md#key-provider-info), then OnDecrypt
MUST fail.

If the call to [KMS Decrypt](#kms-decrypt) succeeds OnDecrypt MUST verify the following:

- verify that the `KeyId` field has a value equal to the [encrypted data key's key provider info](##structures.md#key-provider-info).
- verify that the `Plaintext` is of a length that fits the [algorithm suite](#algorithm-suites.md) given in the decryption materials.

If any of the above are not true, OnDecrpyt MUST NOT update the [decryption materials](#structures.md#decryption-materials)
and MUST fail.

If the response is successfully verified, OnDecrypt MUST do the following with the response:

- set the plaintext data key on the [decryption materials](#structures.md#decryption-materials) as the response `Plaintext`.
- append a new [record](#structures.md#record) to the [keyring trace](#structures.md#keyring-trace)
  in the input [encryption materials](#structures.md#encryption-materials), constructed as follows:
  - The string field KeyNamespace contains "aws-kms".
  - The string field KeyName contains [generator](#generator).
  - The [flags](#structures.md$flags) field of this record includes exactly the following flags:
    - [DECRYPTED DATA KEY](#structures.md#supported-flags)
    - [VERIFIED ENCRYPTION CONTEXT](#structures.md#supported-flags)
- immediately return the modified [decryption materials](#structures.md#decryption-materials).

If OnDecrypt fails to successfully decrypt any [encrypted data key](#structures.md#encrypted-data-key),
then OnDecrypt MUST output the unmodified input [decryption materials](#structures.md#decryption-materials).

## Security Considerations

[TODO: What security properties are guaranteed by this keyring? Also, note how the security properties
can vary drastically depending on key policies]
