[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Key Store Admin

The Key Store Administrative Client,
or just "Key Store Admin".

## Version

1.0.0

### Changelog

- 1.0.0
  - [Initial record](../changes/2025-01-17_key-store-admin/background.md)

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |
| Dafny    | TBD                                    | TBD                       | TBD            |

## Overview

See [Key Store Overview](../branch-key-store.md#overview)
for the general purpose of the Key Store.

The Key Store Administrative Client,
or just Key Store Admin,
consolidates the operations that can create
or modify Branch Keys.

## Definitions

See [Key Store Overview](../branch-key-store.md#definitions).

### `KmsSymmetricKeyArn`

`Kms Symmetric Key Arn` is a Union.

The members of ``KmsSymmetricKeyArn` are a KMS ARN which identifies the KMS Key
that will be used for the operation.
This ARN MUST NOT be an Alias.
This ARN MUST be a valid
[AWS KMS Key ARN](./aws-kms/aws-kms-key-arn.md#a-valid-aws-kms-arn).
This ARN MAY be a Multi-Region Key (MRK) or Single Region Key.

There are two members for this Union.

- KMS Single Region Key ARN (`kmsKeyArn`): [See `KMS Key ARN` in the Key Store Client](../branch-key-store.md#aws-kms-configuration).
- KMS Multi Region Key ARN (`kmsMRKeyArn`): [See `KMS MRKey ARN` in the Key Store Client](../branch-key-store.md#aws-kms-configuration).

### Key Management Strategy

`Key Management Strategy` is a union,
such that additional options maybe added at a later date.

`Key Management Strategy` determines which Operations
of a `Key Management` are used by the Client.

For example,
an MPL Consumer MAY want to avoid calling `kms:ReEncrypt`,
and would rather use `kms:Decrypt` followed by `kms:Encrypt`
to re-wrap a new DECRYPT_ONLY Branch Key as a ACTIVE Branch Key.

At this time,
there are two
`Key Management Strategy`s.

#### AWS KMS ReEncrypt (default)

`AwsKmsReEncrypt` dictates the Key Store Operation use
AWS KMS' ReEncrypt Operation to
[authenticate a Key Store Item](../branch-key-store.md#authenticating-a-keystore-item)
or re-wrap Branch Keys
during [Wrapped Branch Key Creation](../branch-key-store.md#wrapped-branch-key-creation).

`AwsKmsReEncrypt` is a structure that holds a [`AwsKms`](../branch-key-store.md#awskms),
which MAY contain the KMS Client
or Grant Tokens the Key Store,
if they are set,
will use when calling KMS.

`AwsKmsReEncrypt` is the default option if
`Key Management Strategy` is marked as optional
and the parameter is unfilled.

### AWS KMS Decrypt Encrypt

`AwsKmsDecryptEncrypt` dictates the Key Store Operation to use
AWS KMS' Decrypt Operation followed by AWS KMS Encrypt Operation
to re-wrap Branch Keys
during [Wrapped Branch Key Creation](../branch-key-store.md#wrapped-branch-key-creation).

`AwsKmsDecryptEncrypt` is a structure that holds two [`AwsKms`](../branch-key-store.md#awskms),
one designated for Decrypt,
one designated for Encrypt.

This allows MPL Consumers to configure different
credentials or request headers for the KMS Operations.

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Initialization

The Key Store Admin requires the following arguments:

- [Storage](../branch-key-store.md#storage)
- [Logical Key Store Name](../branch-key-store.md##logical-keystore-name)

### User Agent

Whenever possible,
the Key Store Admin SHOULD
append a user agent string to AWS Service requests with
the value of `aws-kms-hierarchy`.

## Operations

The Key Store Admin MUST support the following operations:

- [CreateKey](#createkey)
- [VersionKey](#versionkey)

### CreateKey

The CreateKey caller MUST provide:

- A [`KmsSymmetricKeyArn`](#kmssymmetrickeyarn)

The CreateKey caller MAY provide:

- An optional Identifier
- An optional Encryption Context
- An optional [Key Management Strategy](#key-management-strategy)

At this time,
the [Key Management Strategy](#key-management-strategy) MUST be `AwsKmsReEncrypt`.

The Operation behaves identically to the [Key Store Client's CreateKey](./branch-key-store.md#createkey),
with the following caveats:

#### KMS Configuration

Where ever the Key Store Client's CreateKey method refers to the Key Store's KMS Configuration,
use the equivalent [`KmsSymmetricKeyArn`](#kmssymmetrickeyarn) expression.

#### [Branch Key and Beacon Key Creation](./branch-key-store.md#branch-key-and-beacon-key-creation)

The `AwsKmsReEncrypt` configuration MUST be treated as if it were the Key Store's `AwsKms`.

### VersionKey

The VersionKey caller MUST provide:

- A [`KmsSymmetricKeyArn`](#kmssymmetrickeyarn)
- A `Identifier`

The VersionKey caller MAY provide:

- An optional [Key Management Strategy](#key-management-strategy)

At this time,
the [Key Management Strategy](#key-management-strategy) MUST be `AwsKmsReEncrypt`.

The Operation behaves identically to the [Key Store Client's VersionKey](./branch-key-store.md#versionkey),
with the following caveats:

#### KMS Configuration

Where ever the Key Store Client's CreateKey method refers to the Key Store Client's KMS Configuration,
use the equivalent [`KmsSymmetricKeyArn`](#kmssymmetrickeyarn) expression.

#### [Wrapped Branch Key Creation](./branch-key-store.md#wrapped-branch-key-creation)

The `AwsKmsReEncrypt` configuration MUST be treated as if it were the Key Store's `AwsKms`.

<!--  LocalWords:  MRK AwsKms grantTokenList kmsClient ReEncrypt  -->
<!--  LocalWords:  AwsKmsReEncrypt keystore AwsKmsDecryptEncrypt  -->
<!--  LocalWords:  Admin ReEncrypt Changelog aws arn createkey -->
<!--  LocalWords:  AwsCryptographyKeyStoreOperations versionkey GenerateDataKeyWithoutPlaintext -->
