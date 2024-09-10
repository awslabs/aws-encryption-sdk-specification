[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Key Store Administration Client & Configuration

# Definitions

## Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

# Background

The parameters needed to fetch Branch Keys for usage (encrypt, decrypt)
are distinct from the parameters needed to administrate them
(create, version/rotate, any future operations).

The permissions needed for the persistence medium,
which is DynamoDB by default,
and to Key Management Service,
which currently can only be AWS KMS,
are also different between usage and administration activities.

As such, it makes sense to create a
new Branch Key Store Administration Client,
that cannot facilitate usage,
only administrative operations.

## Alternatives to a new Client/Local Service?

### Refactor Key Store

Rather than creating a new Client/Local Service,
Crypto Tools could refactor the existing
Key Store Client to behave in the manner described below.

This would be a breaking change,
and is therefore not recommended.

### Static Methods on the MPL

A non-breaking change is to add the behaviors
described below to the Material Provider's Local Service/Client,
rather than creating a new Client.

The advantage of such an approach is less software
maintained and documented by Crypto Tools.

However,
this approach forces the Material Provider's Client
to directly reference DynamoDB.  
In the long run,
Crypto Tools MAY want allow MPL Consumers to optionally
depend on the AWS SDK,
as the original AWS Encryption SDK afforded that.
Adding a direct reference to DynamoDB
to the Material Provider's Client
complicates such an ambition.

# Name of the Client?

It is best that we bike shed on this early.

The proposed name for this client is
`the Key Store Admin Client`
though we may often refer to it as
just the `Key Store Admin`.

# Proposed Construction

The Key Store Admin requires the following arguments:

- Storage Reference
- Logical Key Store Name

See [Key Store Persistence Changes](changes/2024-6-17_key-store-persistance/background.md) for details
on Storage Reference.

# Common Parameters and their defaults

## `KMS Identifier`

`KMS Identifier` is a KMS ARN which identifies the KMS Key
that will be used for the operation.
This ARN MUST NOT be an Alias.
This ARN MUST be a valid
[AWS KMS Key ARN](./aws-kms/aws-kms-key-arn.md#a-valid-aws-kms-arn).
This ARN MAY be a Multi-Region Key (MRK) or Single Region Key.

## Key Management

`Key Management` is a union,
such that additional options maybe added at a later date.

Members of `Kms Management` are elements that
authorize the use of Branch Key Cryptographic Materials
by decrypting them in a manner that
authenticates all attributes of the Branch Key.

They are also used to create Branch Key Encrypted Cryptographic Materials,
and when doing so MUST cryptographically bind all attributes of the Branch Key
to the cipher-text.

Currently, there is only one `Key Management` option.

`Key Management` is never used directly by the Key Store Admin.

However, it was introduced into the Key Store
as part of the [Key Store Persistence Changes](changes/2024-6-17_key-store-persistance/background.md).
It is, at least at this time,
not visible to any MPL Consumer facing operations.

### `AwsKms`

`AwsKms` is the only `Key Management` option currently
supported by the Key Store or Key Store Admin.

This option is provided by default,
if no other `Key Management` is provided.

`AwsKms` represents AWS Key Management Service (KMS).

The structure has two optional fields:

- `grantTokenList`, a list of strings
- `kmsClient`, a reference to an AWS SDK KMS client

If no `grantTokenList` is provided,
it defaults to an empty list.

If no `kmsClient` is provided,
the default KMS client is constructed via the AWS SDK.

## Key Management Strategy

`Key Management Strategy` is a union,
such that additional options maybe added at a later date.

`Key Management Strategy` determines which Operations
of a `Key Management` are used by the Client.

For example,
an MPL Consumer MAY want to avoid calling `kms:ReEncrypt`,
and would rather use `kms:Decrypt` followed by `kms:Encrypt`
to re-wrap a new DECRYPT_ONLY Branch Key as a ACTIVE Branch Key.

At this time,
there are only two
`Key Management Strategy`s.

### AWS KMS ReEncrypt (default)

`AwsKmsReEncrypt` dictates the Key Store Operation use
AWS KMS' ReEncrypt Operation to
[authenticate a Key Store Item](../../framework/branch-key-store.md#authenticating-a-keystore-item)
or re-wrap Branch Keys
during [Wrapped Branch Key Creation](../../framework/branch-key-store.md#wrapped-branch-key-creation).

`AwsKmsReEncrypt` is a structure that holds a `AwsKms`,
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
during [Wrapped Branch Key Creation](../../framework/branch-key-store.md#wrapped-branch-key-creation).

`AwsKmsDecryptEncrypt` is a structure that holds two `AwsKms`,
one designated for Decrypt,
one designated for Encrypt.

This allows MPL Consumers to configure different
credentials or request headers for the KMS Operations.

# Modified Operations from the original [Branch Key Store Specification](../../framework/branch-key-store.md#operations)

## CreateKey

The CreateKey caller MUST provide:

- A `KMS Identifier`

The CreateKey caller MAY provide:

- A Branch Key ID
- Encryption Context
- A Key Manager Strategy

The behavior is mostly identical.

However,
during the [Wrapped Branch Key Creation](../../framework/branch-key-store.md#wrapped-branch-key-creation),
the Key Manager Strategy MUST be respected.

## Version Key

The VersionKey caller MUST provide:

- A `KMS Identifier`
- A `branch-key-id`

The VersionKey caller MAY provide:

- A Key Manager Strategy

The behavior is mostly identical.

However,
during the [Wrapped Branch Key Creation](../../framework/branch-key-store.md#wrapped-branch-key-creation),
the Key Manager Strategy MUST be respected.

<!--  LocalWords:  MRK AwsKms grantTokenList kmsClient ReEncrypt  -->
<!--  LocalWords:  AwsKmsReEncrypt keystore AwsKmsDecryptEncrypt  -->
<!--  LocalWords:  Admin ReEncrypt  -->
