[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Base CMM

## Affected Features

This serves as a reference of all features that this change affects.

| Feature                                       |
| --------------------------------------------- |
| [Default CMM](../../framework/default-cmm.md) |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                                 |
| --------------------------------------------- |
| [Default CMM](../../framework/default-cmm.md) |

## Affected Implementations

This serves as a reference for all implementations that this change affects.

| Language   | Repository                                                                            |
| ---------- | ------------------------------------------------------------------------------------- |
| Python     | [aws-encryption-sdk-python](https://github.com/aws/aws-encryption-sdk-python)         |
| Java       | [aws-encryption-sdk-java](https://github.com/aws/aws-encryption-sdk-java)             |
| C          | [aws-encryption-sdk-c](https://github.com/aws/aws-encryption-sdk-c)                   |
| Javascript | [aws-encryption-sdk-javascript](https://github.com/aws/aws-encryption-sdk-javascript) |

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

The Default Cryptographic Materials Manager (CMM) is an implementation of the CMM interface that serves a majority of use cases,
using [keyrings](../../framework/keyring-interface.md) or
[master key providers](../../framework/master-key-provider-interface.md) to get and
decrypt materials.

This change proposes that we instead define that implementation under new names,
Keyring CMM and Master Key Provider CMM,
and define the Default CMM to be the specific composition of one or more CMMs
that customers SHOULD use.

## Out of Scope

- The behavior of any existing CMMs implementations.

## Motivation

Prior to this change, the Default CMM serves two purposes.
First, it provides a base implementation of a CMM that:

- Uses a keyring or master key provider to provide valid materials.
- Handles providing the signature key and verification key with the materials.

Second, it serves as a safe default that can be used for most use cases.

While there is currently no conflict in these purposes,
this might not always be true.
In the future we might want to update the behavior customers get when they choose some "default"
CMM option.

One way to address this would be to directly add the new desired behavior
to the current Default CMM implementation,
however this makes our provided CMMs less composable.
Keeping the CMM composable is important because it allows users to assert desired properties
[by construction](https://github.com/awslabs/aws-encryption-sdk-specification/blob/2ec7674c304c408c2a32d412e834939c73f68d80/tenets.md#correct-by-construction).
Additionally this approach would not allow customers to opt out of this new behavior if
it is not desirable for their use case.
Because it is important to retain this base implementation,
we should define a CMM whose sole purpose is to be this base implementation.
We will call this CMM implementation the Keyring CMM.
For implementations which need to support master key provider, we will also define a
Master Key Provider CMM.

Similar to how we define a set of algorithm suites and define a default algorithm suite,
we should similarly have a set of provided CMM implementations
and a Default CMM which represents a particular configuration of one of those CMMs
(possibly composed with other CMMs).
We will define that the Default CMM is "the Keyring CMM".
Just as an example, if we wanted to provide caching as a default behavior,
the Default CMM could be defined as "the Caching CMM configured with a Keyring CMM."
By defining the default in this way, we have greater flexibility to update the default
CMM that customers use in the future without losing the composability of these implementations.

Such a default MUST NOT allow any options other than the keyring to be configured in order
to allow us to more easily maintain backwards compatability with possible Default CMM updates.

## Drawbacks

This change SHOULD NOT have any drawbacks.

## Security Implications

This change SHOULD NOT have any security implications.

## Operational Implications

This change SHOULD NOT have any operational implications.

This change MUST maintain behavior for customers who are using a Default CMM.

## Guide-level Explanation

This change defines the [Keyring CMM](#keyring-cmm) and
the [Master Key Provider CMM](#master-key-provider-cmm)
as base CMM implementations that can be used "as is" or composed with other CMMs.

This change also defines a [Default CMM](#default-cmm) as a specific configuration of a CMM
that the AWS Encryption SDK provides as a safe default.

Customers SHOULD either use the [Default CMM](#default-cmm)
or compose a CMM using the AWS Encryption SDK's provided CMM implementations
(including the Keyring CMM).

### Default CMM

The Default CMM is a specific configuration of a
CMM implementation provided by the AWS Encryption SDK.

The specific CMM configuration describes a
[safe default](https://github.com/awslabs/aws-encryption-sdk-specification/blob/2ec7674c304c408c2a32d412e834939c73f68d80/tenets.md#sensible-defaults)
that serves most use cases.

The CMM configuration defined by the Default CMM is the [Keyring CMM](#keyring-cmm) as is
(the Keyring CMM provides no additional options other than specifying an underlying keyring).

As the AWS Encryption SDK provides more CMM implementations that would benefit default use cases,
we expect to update the Default CMM to a configuration which composes such CMMs together in order to provide
useful properties.
Any update to the composition defined by Default CMM SHOULD be backwards compatable.

To ensure that its use is correct by construction,
the instantiation of the Default CMM MUST NOT take any options
except for the keyring that should be composed with the Default CMM.

### Keyring CMM

The Keyring CMM is a base CMM implementation that
[gets encryption materials](../../framework/cmm-interface.md#get-encryption-materials)
and [decrypts materials](../../framework/cmm-interface.md#decrypt-materials)
through use of a [keyring](../../framework/keyring-interface.md) configured on instantiation.

Any desired CMM implementation that intends to use keyrings to ensure valid materials SHOULD
compose with the Keyring CMM.

### Master Key Provider CMM

Any implementation that previously supported
[master key providers](../../framework/master-key-provider-interface.md)
MUST have a Master Key Provider CMM.
Any implementation that does not support master key providers MUST NOT
provide a Master Key Provider CMM.

This CMM SHOULD NOT be used except for backwards compatability reasons.

The Master Key Provider CMM is a base CMM implementation that
[gets encryption materials](../../framework/cmm-interface.md#get-encryption-materials)
and [decrypts materials](../../framework/cmm-interface.md#decrypt-materials)
through use of a [master key provider](../../framework/master-key-provider-interface.md)
configured on instantiation.

Any desired CMM implementation that intends to use master key providers to ensure valid materials
SHOULD compose with the Master Key Provider CMM.

## Reference-level Explanation

### Default CMM

On initialization, the caller MUST provide exactly one of the following:

- [Keyring](../../framework/keyring-interface.md)
- If this AWS Encryption SDK implementation provides a [Master Key Provider CMM](#master-key-provider-cmm),
  a [Master Key Provider](../../framework/master-key-provider-interface.md)

The Default CMM MUST NOT accept any additional configuration.

It MUST construct a CMM in the following manner:

- If a keyring was supplied, initialize a [Keyring CMM](#keyring-cmm) with the provided keyring.
- If a master key provider was supplied, initialize a [Master Key Provider CMM](#keyring-cmm)
  with the provided master key provider.

This CMM MUST NOT offer any additional features beyond the composed CMM created
above.

Functionality exposed by the AWS Encryption SDK MUST NOT require the Default CMM.

### Keyring CMM

The specification of the Keyring CMM MUST be the specification of the
Default CMM prior to this change.

### Master Key Provider CMM

The specification of the Master Key Provider CMM MUST be the specification of the Default CMM,
except describing the use of a master key provider instead of a keyring
where appropriate.
