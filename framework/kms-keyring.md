[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS KMS Keyring

## Version

0.2.2

### Changelog

- 0.2.2

  - Rename Key IDs to [Key Names](#key-names) for increased clarity
  - Update [Key Names](#key-names) and [Generator](#generator) sections to reinforce support for all AWS KMS key identifiers
  - [Pull request link for discussions](https://github.com/awslabs/aws-encryption-sdk-specification/pull/123)

- 0.2.1

  - [Clarify naming of KMS to AWS KMS](https://github.com/awslabs/aws-encryption-sdk-specification/issues/67)

- 0.2.0

  - [Remove Keyring Trace](../changes/2020-05-13_remove-keyring-trace/change.md)

- 0.1.0-preview

  - Initial record

## Implementations

| Language                                  | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                                         |
| ----------------------------------------- | -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C (AWS KMS keyring implementation in C++) | 0.1.0-preview                          | 0.1.0                     | [kms_keyring.cpp](https://github.com/aws/aws-encryption-sdk-c/blob/master/aws-encryption-sdk-cpp/source/kms_keyring.cpp)                               |
| Javascript                                | 0.1.0-preview                          | 0.1.0                     | [kms_keyring.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/kms-keyring/src/kms_keyring.ts)                          |
| Python                                    | 0.1.0-preview                          | n/a                       | [keyrings/aws_kms](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/keyrings/aws_kms/__init__.py)                   |
| Java                                      | 0.1.0-preview                          | n/a                       | [AwsKmsKeyring.java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/keyrings/AwsKmsKeyring.java) |

For legacy reasons, the JavaScript implementation of this keyring is represented as the KMS Keyring instead of the AWS KMS Keyring.

## Overview

A keyring which interacts with AWS Key Management Service (AWS KMS) to create, encrypt, and decrypt data keys
using AWS KMS defined Customer Master Keys (CMKs).

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

#### AWS KMS Client

A client which implements the following APIs:

- [AWS KMS GenerateDataKey](#aws-kms-generatedatakey)
- [AWS KMS Encrypt](#aws-kms-encrypt)
- [AWS KMS Decrypt](#aws-kms-decrypt)

### AWS KMS GenerateDataKey

An AWS KMS API for generating a unique data key, and encrypting that data key under a specified CMK.

See [AWS Documentation](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html).

### AWS KMS Encrypt

An AWS KMS API for encrypting plaintext under a specified CMK.

See [AWS Documentation](https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html).

### AWS KMS Decrypt

An AWS KMS API for decrypting ciphertext previously encrypted by [GenerateDataKey](#aws-kms-generatedatakey) or [Encrypt](#aws-kms-encrypt).

See [AWS Documenetation](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html).

## Inputs

On keyring initialization, a keyring MUST define the following:

- [Client Supplier](#client-supplier)

On keyring initialization, a keyring MAY define the following:

- [Key Names](#key-names)
- [Generator](#generator)
- [Grant Tokens](#grant-tokens)

### Client Supplier

In order to communicate with AWS KMS,
the AWS KMS keyring requires an AWS SDK client.
The role of the client supplier is to
create and configure those clients
and supply them to the AWS KMS keyring.

A function that MUST take as input either a region string (e.g. `us-east-1`), or some value denoting an unknown region,
and MAY return an AWS KMS Client that can make the following API calls in the given AWS region:

- [GenerateDataKey](#aws-kms-generatedatakey)
- [Encrypt](#aws-kms-encrypt)
- [Decrypt](#aws-kms-decrypt)

If the client supplier cannot supply a client for the requested region,
it MUST communicate that fact to the AWS KMS keyring.

### Key Names

A list of strings identifying the [AWS KMS customer master keys (CMKs)](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id)
that the AWS KMS keyring uses to encrypt and decrypt data keys.

The AWS KMS keyring accepts any value for a key name that is [accepted by AWS KMS as a key identifer](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id).
The AWS KMS keyring does not validate any value for a key name and passes this information to AWS KMS.

Note that only key names in the [key ARN format](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html#arn-syntax-kms) are used for decryption
because encrypted data keys constructed by the AWS KMS keyring always store the ID of the CMK used to encrypt it in the key ARN format
and [OnDecrypt](#ondecrypt) checks the key name against that
value before attempting decryption.

The AWS KMS caller
MUST have [kms:Encrypt](https://docs.aws.amazon.com/kms/latest/developerguide/kms-api-permissions-reference.html#AWS-KMS-API-Operations-and-Permissions) permission
for each AWS KMS CMK specified in the key names.

### Generator

A string that identifies an [AWS KMS customer master key (CMK)](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id)
that the AWS KMS keyring uses to generate, encrypt, and decrypt data keys.

The AWS KMS keyring accepts any value for a generator that is [accepted by AWS KMS as a key identifer](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id).
The AWS KMS keyring does not validate any value for a generator and passes this information to AWS KMS.

Note that only generators in the [key ARN format](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html#arn-syntax-kms) are used for decryption
because encrypted data keys constructed by the AWS KMS keyring always store the ID of the CMK used to encrypt it in the key ARN format
and [OnDecrypt](#ondecrypt) checks the generator against that
value before attempting decryption.

The generator SHOULD NOT be included in the [key names](#key-names),
otherwise this CMK is used to encrypt the plaintext data key twice.

The AWS KMS caller
MUST have [kms:GenerateDataKey](https://docs.aws.amazon.com/kms/latest/developerguide/kms-api-permissions-reference.html#AWS-KMS-API-Operations-and-Permissions) permission
for the AWS KMS CMK specified by the generator.

### Grant Tokens

A list of string grant tokens to be included in all AWS KMS calls.

See [AWS Documentation](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token)
for how AWS KMS uses grant tokens.

## Derived Properties

The following is a derived property of the AWS KMS keyring:

- [Is Discovery](#is-discovery)

### Is Discovery

Indicates whether this keyring is a discovery keyring.
Discovery keyrings do not perform encryption and on decryption attempt to decrypt
any [encrypted data key](structures.md#encrypted-data-key) that was encrypted by the AWS KMS keyring,
if the client supplier returns a client.

If this keyring has defined a [generator](#generator) or [key names](#key-names), this value MUST be false.
Otherwise, this value MUST be true.

If this value is true, the keyring MUST only ever call [AWS KMS Decrypt](#aws-kms-decrypt).

## Operation

### OnEncrypt

OnEncrypt MUST take [encryption materials](structures.md#encryption-materials) as input.

If this keyring is a [discovery keyring](#is-discovery), OnEncrypt MUST return the input
[encryption materials](structures.md#encryption-materials) unmodified.

If the input [encryption materials](structures.md#encryption-materials) do not contain a plaintext data key
and this keyring does not have a [generator](#generator) defined,
OnEncrypt MUST not modify the [encryption materials](structures.md#encryption-materials)
and MUST fail.

If the input [encryption materials](structures.md#encryption-materials) do not contain a plaintext data key
and this keyring has a [generator](#generator) defined, and onEncrypt MUST attempt to generate a new plaintext data key
and encrypt that data key by calling [AWS KMS GenerateDataKey](#aws-kms-generatedatakey).

If an AWS region can be extracted from the [generator](#generator), then the [AWS KMS client](#aws-kms-client) that calls
[AWS KMS GenerateDataKey](#aws-kms-generatedatakey) MUST be the client returned by the [client supplier](#client-supplier)
when given that region as input.
If an AWS region cannot be extracted from the [generator](#generator) then the AWS KMS Keyring MUST input a value denoting an unknown region.
If the [client supplier](#client-supplier) does not provide any client for the given region for this [AWS KMS GenerateDataKey](#aws-kms-generatedatakey) call, OnEncrypt MUST NOT modify the [encryption materials](structures.md#encryption-materials)
and MUST fail.

When calling [AWS KMS GenerateDataKey](#aws-kms-generatedatakey), the keyring MUST call with a request constructed as follows:

- `KeyId`: this keyring's [generator](#generator).
- `NumberOfBytes`: the [key derivation input length](algorithm-suites.md#key-derivation-input-length)
  specified by the [algorithm suite](algorithm-suites.md) included in the input [encryption materials](structures.md#encryption-materials).
- `EncryptionContext`: the [encryption context](structures.md#encryption-context) included in
  the input [encryption materials](structures.md#encryption-materials).
- `GrantTokens`: this keyring's [grant tokens](#grant-tokens)

If the call to [AWS KMS GenerateDataKey](#aws-kms-generatedatakey) does not succeed, OnEncrypt MUST NOT
modify the [encryption materials](structures.md#encryption-materials) and MUST fail.

If the call succeeds, OnEncrypt MUST verify that the response `Plaintext` length matches the specification
of the [algorithm suite](algorithm-suites.md)'s Key Derivation Input Length field.
If it does not, OnEncrypt MUST fail.
If verified, OnEncrypt MUST do the following with the response from [AWS KMS GenerateDataKey](#aws-kms-generatedatakey):

- set the plaintext data key on the [encryption materials](structures.md#encryption-materials)
  as the response `Plaintext`.
- append a new [encrypted data key](structures.md#encrypted-data-key) to the encrypted data key list
  in the [encryption materials](structures.md#encryption-materials), constructed as follows:
  - the [ciphertext](structures.md#ciphertext) is the response `CiphertextBlob`.
  - the [key provider id](structures.md#key-provider-id) is "aws-kms".
  - the [key provider information](structures.md#key-provider-information) is the response `KeyId`.
    Given a plaintext data key in the [encryption materials](structures.md#encryption-materials),
    OnEncrypt MUST attempt to encrypt the plaintext data key using each CMK specified in its [key names](#key-names) list.

If this keyring's [generator](#generator) is defined and was not used to [generate a data key](#aws-kms-generatedatakey)
as described above, OnEncrypt MUST also attempt to encrypt the plaintext data key using the CMK specified by the [generator](#generator).

To attempt to encrypt the plaintext data key with a particular CMK, OnEncrypt MUST call [AWS KMS Encrypt](#aws-kms-encrypt).

For each [AWS KMS Encrypt](#aws-kms-encrypt) call, if an AWS region can be extracted from the [key name](#key-names), then the
[AWS KMS client](#aws-kms-client) that calls [AWS KMS Encrypt](#aws-kms-encrypt) MUST be the client returned by the
[client supplier](#client-supplier) when given that region as input.
If an AWS region cannot be extracted from the key name then the AWS KMS Keyring MUST input a value denoting an unknown region.
If the [client supplier](#client-supplier) does not provide any client
for the given region for this [AWS KMS Encrypt](#aws-kms-encrypt) call,
OnEncrypt MUST NOT modify the [encryption materials](structures.md#encryption-materials)
and MUST fail.

To encrypt the plaintext data key with a CMK, OnEncrypt MUST call [AWS KMS Encrypt](#aws-kms-encrypt) with a request
constructed as follows:

- `KeyId`: the CMK ARN to be used for data key encryption.
- `PlaintextDataKey`: the plaintext data key in the [encryption materials](structures.md#encryption-materials).
- `EncryptionContext`: the [encryption context](structures.md#encryption-context) included in
  the input [encryption materials](structures.md#encryption-materials).
- `GrantTokens`: this keyring's [grant tokens](#grant-tokens)

If the call to [AWS KMS Encrypt](#aws-kms-encrypt) does not succeed OnEncrypt MUST fail.

If the call succeeds, OnEncrypt MUST do the following with the response from [AWS KMS Encrypt](#aws-kms-encrypt):

- append a new [encrypted data key](structures.md#encrypted-data-key) to the encrypted data key list
  in the [encryption materials](structures.md#encryption-materials), constructed as follows:
  - The [ciphertext](structures.md#ciphertext) is the response `CiphertextBlob`.
  - The [key provider id](structures.md#key-provider-id) is "aws-kms".
  - The [key provider information](structures.md#key-provider-information) is the response `KeyId`.
    Note that the `KeyId` in the response is always in key ARN format.

If all Encrypt calls succeed, OnEncrypt MUST output the modified [encryption materials](structures.md#encryption-materials).

### OnDecrypt

OnDecrypt MUST take [decryption materials](structures.md#decryption-materials) and
a list of [encrypted data keys](structures.md#encrypted-data-key) as input.

The set of [encrypted data keys](structures.md#encrypted-data-key) that OnDecrypt MUST attempt
to decrypt depends on if this keyring is a [discovery keyring](#is-discovery) or not.

If this keyring is a [discovery keyring](#is-discovery), OnDecrypt MUST attempt to decrypt every
[encrypted data key](structures.md#encrypted-data-key) in the input encrypted data key list
with the following condition, until it successfully decrypts one:

- the [key provider ID](structures.md#key-provider-id) field has the value "aws-kms"

Otherwise, OnDecrypt MUST attempt to decrypt each input [encrypted data key](structures.md#encrypted-data-key)
in the input encrypted data key list with the following conditions, until it successfully decrypts one:

- the [key provider ID](structures.md#key-provider-id) field has the value "aws-kms"
- the [key provider info](structures.md#key-provider-information) has a value equal to one of the
  ARNs in this keyring's [key names](#key-names) or the [generator](#generator).

To attempt to decrypt a particular [encrypted data key](structures.md#encrypted-data-key),
OnDecrypt MUST call [AWS KMS Decrypt](#aws-kms-decrypt).

For each [AWS KMS Decrypt](#aws-kms-decrypt) call, an AWS region MUST be extracted from the [encrypted data key](structures.md#encrypted-data-key)'s [key provider info](structures.md#key-provider-information).
The AWS KMS Keyring MUST call [AWS KMS Decrypt](#aws-kms-decrypt) using the client supplied by the [client supplier](#client-supplier), given the region as input.

If the client supplier does not provide any client for the given region for this Decrypt call, OnDecrypt MUST skip that particular [encrypted data key](structures.md#encrypted-data-key).

When calling [AWS KMS Decrypt](#aws-kms-decrypt), the keyring MUST call with a request constructed as follows:

- `CiphertextBlob`: the [encrypted data key ciphertext](structures.md#ciphertext).
- `EncryptionContext`: the [encryption context](structures.md#encryption-context) included in
  the input [decryption materials](structures.md#decryption-materials).
- `GrantTokens`: this keyring's [grant tokens](#grant-tokens)

If the call to [AWS KMS Decrypt](#aws-kms-decrypt) does not succeed OnDecrypt MUST continue and attempt to
decrypt the remaining [encrypted data keys](structures.md#encrypted-data-key).

If the `KeyId` field in the response from [AWS KMS Decrypt](#aws-kms-decrypt) does not have a value equal to
the [encrypted data key's key provider info](structures.md#key-provider-information), then OnDecrypt
MUST fail.

If the call to [AWS KMS Decrypt](#aws-kms-decrypt) succeeds OnDecrypt MUST verify the following:

- verify that the `KeyId` field has a value equal to the [encrypted data key's key provider info](structures.md#key-provider-information).
- verify that the `Plaintext` is of a length that fits the [algorithm suite](algorithm-suites.md) given in the decryption materials.

If any of the above are not true, OnDecrpyt MUST NOT update the [decryption materials](structures.md#decryption-materials)
and MUST fail.

If the response is successfully verified, OnDecrypt MUST do the following with the response:

- set the plaintext data key on the [decryption materials](structures.md#decryption-materials) as the response `Plaintext`.
- immediately return the modified [decryption materials](structures.md#decryption-materials).

If OnDecrypt fails to successfully decrypt any [encrypted data key](structures.md#encrypted-data-key),
then OnDecrypt MUST output the unmodified input [decryption materials](structures.md#decryption-materials).

## Configuration Intent

### OnEncrypt Goal

When a user configures an AWS KMS keyring with key names
and uses that keyring to encrypt a message,
they are stating their intent that they need each one of those CMKs to be able to
independently decrypt the resulting encrypted message.

For example, if a user configures an AWS KMS keyring with CMKs A, B, and C
and uses that keyring to encrypt a message,
then that user expects three things to be true:

1. CMK A can decrypt the encrypted message.
1. CMK B can decrypt the encrypted message.
1. CMK C can decrypt the encrypted message.

If any of these are not true of the resulting encrypted message,
the keyring has failed to honor the user's intent.

In order to accomplish this,
the AWS KMS keyring MUST contribute three encrypted data keys to the encryption materials:
one from CMK A, one from CMK B, and one from CMK C.

### OnDecrypt Goal

When a user configures an AWS KMS keyring for use on decrypt,
they are stating their intent for which CMKs
the keyring _attempts_ to use to decrypt encrypted data keys.

For example, if a user configures an AWS KMS keyring with CMK C (using the CMK ARN)
and uses it to decrypt an encrypted message
that contains encrypted data keys for CMKs A, B, and C,
then the keyring attempts to decrypt using CMK C.

However, if the keyring attempts to decrypt using CMK C and cannot,
this failure still honors the configured intent and MUST NOT halt decryption.
The configured intent is that the keyring MUST _attempt_ with these CMKs,
not that they MUST _succeed_.

### Why OnEncrypt and OnDecrypt are different

On encrypt, the user describes their intent
for the requirements to decrypt the resulting message.
Because of this,
the keyring MUST create encryption materials that satisfy those requirements.

On decrypt, the user provides resources that _attempt_ to do that decryption.

This is an asymmetric relationship with very different implications on failure.
If the keyring encounters a problem on encrypt,
it cannot fully honor the decryption requirements and so MUST halt message encryption.

However, on decrypt the keyring is not creating anything.
It is instead attempting to satisfy the requirements that were set on encryption.
If the keyring cannot satisfy those requirements it MUST NOT halt message decryption.

No keyring can know if it is the last keyring to attempt decryption.
If all keyrings are exhausted and none of them were able to decrypt an encrypted data key
then the cryptographic materials manager that managed those keyrings
halts message decryption.
(See [Default Cryptographic Materials Manager](./default-cmm.md))

### Requirements

These goals can be reduced to the following two requirements:

1. On encrypt, if any configured CMK cannot be used,
   that is an error and encryption MUST halt.
1. On decrypt, the keyring MUST NOT halt decryption because of a failure to decrypt.

## Security Considerations

[TODO: What security properties are guaranteed by this keyring? Also, note how the security properties
can vary drastically depending on key policies]

## Contributing Issues

This is a record of issues that contributed to this specification.

- [#173 Resolve incorrect description of behavior of additional CMKs on encrypt.](https://github.com/awslabs/aws-encryption-sdk-specification/issues/73)
