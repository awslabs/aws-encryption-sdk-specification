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

The Default CMM is an implementation of the CMM interface that serves a majority of use cases,
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
First, it provides a base implementation of a CMM that uses a
keyring or master key provider to ensure valid materials.
Second, it serves as safe default that can be used for most use cases.

While there is currently no conflict in these purposes,
this might not always be true.
In the future we might want to update the behavior customers get when they choose some "default"
CMM option.

One way to address this would be to directly add the new desired behavior
to the current Default CMM implementation,
however this makes our provided CMMs less composable.
Keeping the CMM composable is important because it allows users to assert desired properties
[by construction](../../tenets.md#correct-by-construction).
Because it is important to retain this base implementation,
we should define a CMM whose sole purpose is to be this base implementation.
We will call this CMM implementation the Keyring CMM.
For implementations which need to support master key provider, we will also define a
Master Key Provider CMM.

Similar to how we define a set of algorithm suites and define a default algorithm suite,
we should similarly have a set of provided CMM implementations
and a Default CMM which represents a particular configuration of one of those CMMs
(possible composed with other CMMs).
Right now, we define that the Default CMM is "the Keyring CMM".
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
as base CMM implementations that can be used "as is" or composed with other CMM.

This change also defines a [Default CMM](#default-cmm) as a specific composition of one or more
CMMs that the AWS Encryption SDK provides as a safe default that can be used for most use cases.

Customers SHOULD either use the [Default CMM](#default-cmm)
or compose a CMM using the AWS Encryption SDK's provided CMM implementations
(including the Keyring CMM).

### Default CMM

The Default CMM is a specific composition and configuration of one or more
CMM implementations provided by the AWS Encryption SDK.

The specific CMM composition describes a safe default that serves most use cases.

The CMM composition defined by the Default CMM is the [Keyring CMM](#keyring-cmm).

As the AWS Encryption SDK provides more CMMs implementations that would benefit default use cases,
we expect to update the composition defined by Default CMM to include these new CMMs.
Any update to the composition defined by Default CMM SHOULD be backwards compatable.

To ensure that its use is correct by construction,
the instantiation of the Default CMM MUST NOT take any options
except for the keyring that should be composed with the Default CMM.

Functionality exposed by the AWS Encryption SDK MUST NOT require the Default CMM.

### Keyring CMM

The Keyring CMM is a base CMM implementation that
[gets encryption materials](../../framework/cmm-interface.md#get-encryption-materials)
and [decrypts materials](../../framework/cmm-interface.md#decrypt-materials)
through use of a [keyring](../../framework/keyring-interface.md) configured on instantiation.

This CMM can be used as is or composed with other CMMs,
but is also provided as the [Default CMM](#default-cmm).

Any desired CMM implementation that intends to use keyrings to ensure valid materials SHOULD
compose with the Keyring CMM.

### Master Key Provider CMM

Any implementation that previously supported
[master key providers](../../framework/master-key-provider-interface.md)
MUST have a Master Key Provider CMM.

The Master Key Provider CMM is a base CMM implementation that
[gets encryption materials](../../framework/cmm-interface.md#get-encryption-materials)
and [decrypts materials](../../framework/cmm-interface.md#decrypt-materials)
through use of a [master key provider](../../framework/master-key-provider-interface.md)
configured on instantiation.

This CMM can be used as is or composed with other CMMs.

Any desired CMM implementation that intends to use master key providers to ensure valid materials
SHOULD compose with the Keyring CMM.

This CMM SHOULD NOT be used except for backwards compatability reasons.

## Reference-level Explanation

### Default CMM

On initialization it MUST accept:

- an underlying [Keyring](../../framework/keyring-interface.md)

It MUST NOT take any additional configuration.

It MUST construct a CMM in the following manner:

- Initialize a [Keyring CMM](#keyring-cmm) with the configured underlying Keyring

This CMM MUST NOT offer any additional features beyond the composed CMM created
above.

### Keyring CMM

The specification of the Keyring CMM MUST be the specification of the
Default CMM prior to this change.

### Master Key Provider CMM

The specification of the Master Key Provider CMM MUST be the specification of
the Default CMM, except using a master key provider instead of a keyring
where appropriate.
