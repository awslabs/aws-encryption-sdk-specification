[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Base CMM

## Affected Features

This serves as a reference of all features that this proposal affects.

| Feature                                       |
| --------------------------------------------- |
| [Default CMM](../../framework/default-cmm.md) |

## Affected Specifications

This serves as a reference of all specification documents that this proposal affects.

| Specification                                 |
| --------------------------------------------- |
| [Default CMM](../../framework/default-cmm.md) |

## Affected Implementations

This serves as a reference for all implementations that this proposal affects.

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

This document proposes that we split that implementation into new CMMs,
a Keyring CMM and Set Unspecified Request Values CMM,
and define the Default CMM to be a specific composition of those CMMs
that uses default values.

## Out of Scope

- Updating the behavior of any existing CMMs implementations.

## Motivation

Prior to this proposal, the Default CMM served three purposes.

First, it provided a base implementation of a CMM that performed the necessary functions
required to provide valid encryption or decryption materials:

- It provided encrypted data keys and the plaintext data key for encryption materials,
  and decrypted the plaintext data key from encrypted data keys to provide decryption materials.
  This is done using a keyring or master key provider.
- It handled providing the signature key and verification key with the materials.

Second, it defined what algorithm suite to use if the customer did not specify one for encryption.

Third, it served as a
[sensible default](https://github.com/awslabs/aws-encryption-sdk-specification/blob/2ec7674c304c408c2a32d412e834939c73f68d80/tenets.md#sensible-defaults)
CMM implementation that served most use cases.
This default CMM implementation describes the default set of behavior as well as default
configuration options for encryption and decryption.

While there is currently no conflict in these purposes,
this might not always be true.
In the future we might want to update the behavior customers get when they choose some "default"
CMM option.

However, we also want to retain a pure base implementation of the CMM in order to keep
our provided CMMs composable.
Keeping the CMM composable is important because it allows customers to assert desired properties
[by construction](https://github.com/awslabs/aws-encryption-sdk-specification/blob/2ec7674c304c408c2a32d412e834939c73f68d80/tenets.md#correct-by-construction).
By keeping our CMMs composable, we make it easy for customers to compose
CMMs that opt out of specific default behaviors which might not be useful for their use case,
or reuse specific default behaviors in compositions with other CMMs.

Thus we redefine what the Default CMM means.
Instead of having the Default CMM describe some implementation that implements the CMM interface,
we instead define it as a specific composition of provided CMM implementations
that express desired default behaviors and configurations.
We need to provide an easy way for users to choose our default CMM behaviors
such that if they use this default CMM
they know that they are always using what the AWS Encryption SDK recommends as a
[sensible default](https://github.com/awslabs/aws-encryption-sdk-specification/blob/2ec7674c304c408c2a32d412e834939c73f68d80/tenets.md#sensible-defaults)
for all aspects of encryption and decryption.
This proposal calls this specific implementation the [Default CMM](#default-cmm).

Thus, we need to make sure that we provide CMM implementations that can be composed together
to produce the desired default behaviors:

- Provide valid materials using a keyring or master key provider as input.
- Use a sensisble default if the algorithm suite is unspecified on encryption.

We can do this by providing two different CMM implementations that each tackle one of the
above requirements:

- A stand alone CMM implementation that is only concerned with providing
  valid materials using a keyring or master key provider.
  This proposal calls this the [Keyring CMM](#keyring-cmm) or [Master Key Provider CMM](#master-key-provider-cmm).
- A CMM implementation that wraps another CMM and sets unspecified values in the
  Get Encryption Materials request to a particular value.
  This proposal calls this the [Set Unspecified Request Values CMM](#set-unspecified-request-values-cmm).

While the latter implementation might seem to be so simple it doesn't need to be its own CMM,
it is necessary in order to be able to express the Default CMM as a specific composition
while still keeping the Keyring CMM implementation simple and focused.

## Drawbacks

This proposal SHOULD NOT have any drawbacks.

## Security Implications

This proposal SHOULD NOT have any security implications.

## Operational Implications

This proposal SHOULD NOT have any operational implications.

This proposal MUST maintain behavior for customers who are using a Default CMM.

## Guide-level Explanation

This proposal defines the [Keyring CMM](#keyring-cmm) and
the [Master Key Provider CMM](#master-key-provider-cmm)
as base CMM implementations that can be used "as is" or composed with other CMMs.

This proposal also defines a [Set Unspecified Request Values CMM](#set-unspecified-request-values-cmm)
as a CMM implementation that can wrap others in order to default the algorithm suite used to a specific value.

This proposal also defines a [Default CMM](#default-cmm) as a specific composition of CMMs
that the AWS Encryption SDK provides as a safe default.

Customers SHOULD either use the [Default CMM](#default-cmm)
or compose a CMM using the AWS Encryption SDK's provided CMM implementations
(including the Keyring CMM).

### Default CMM

The Default CMM is a specific configuration of a
CMM implementation provided by the AWS Encryption SDK that takes a keyring as input.

The specific CMM configuration describes the set of CMM behaviors and configuration options
that the AWS Encryption SDK recomends as a sensible default.

The behavior we define as default is the behavior of the Default CMM prior to this proposal.

As the AWS Encryption SDK provides more CMM implementations in the future that would benefit default use cases,
we expect to update the Default CMM to a configuration which composes such CMMs together in order to provide
useful properties.
Any update to the composition defined by Default CMM MUST be backwards compatable.

To ensure that its use is correct by construction,
the instantiation of the Default CMM MUST NOT take any options
except for the keyring that should be composed with the Default CMM.

### Keyring CMM

The Keyring CMM is a base CMM implementation that
[gets encryption materials](../../framework/cmm-interface.md#get-encryption-materials)
and [decrypts materials](../../framework/cmm-interface.md#decrypt-materials)
through use of a [keyring](../../framework/keyring-interface.md) configured on instantiation.

It requires an algorithm suite to be set in the Get Encryption Materials Request.

Any desired CMM implementation that intends to use keyrings to ensure valid materials SHOULD
compose with the Keyring CMM.

### Set Unspecified Request Values CMM

The Set Unspecified Request Values CMM is a CMM implementation that wraps another CMM implementation
and sets unspecified parameters in the Get Encryption Materials Request to a particular vaule.

On initialization, it accepts an Underlying CMM and Algorithm Suite as input.

On Get Encryption Materials, it forwards the Get Encryption Materials Request to the Underlying CMM,
setting the algorithm suite in the request to the input Algorithm Suite if unspecified.

On Decrypt Materials, it forwards the Decryption Materials Request to the Underlying CMM.

### Legacy

Implementations that supported creating Default CMMs with master key providers prior to this proposal
MUST also support providing a Default CMM composition that takes in a master key provider as input.
Any such provided Default CMM MUST use a [Master Key Provider CMM](#master-key-provider-cmm)
instead of a Keyring CMM.

Implementations that never supported creating Default CMMs with master key providers MUST NOT
provide a Default CMM that takes a master key provider as input.

#### Master Key Provider CMM

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

On initialization, the caller MUST provide a [Keyring](../../framework/keyring-interface.md).

The Default CMM MUST NOT accept any additional configuration.

It MUST construct a CMM in the following manner:

- Initialize a [Set Unspecified Request Values CMM](#set-unspecified-request-values-cmm-2) with the following:
  - The Algorithm Suite ID is the [default Algorithm Suite ID](../../framework/algorithm-suites.md).
  - The Underling CMM is a [Keyring CMM](#keyring-cmm-2) initialized with the provided keyring.

This CMM MUST NOT offer any additional features beyond the composed CMM created
above.

Functionality exposed by the AWS Encryption SDK MUST NOT require the Default CMM.

### Keyring CMM

The specification of the Keyring CMM MUST be the specification of the
Default CMM prior to this proposal, with the following addition:

- During Get Encryption Materials, if the Get Encryption Materials Request does not contain
  an algorithm suite, this CMM MUST fail.

### Set Unspecified Request Values CMM

On initialization, the caller MUST provide the following:

- [Underlying CMM](../../framework/cmm-interface.md)
- [Algorithm Suite ID](../../framework/algorithm-suites.md)

On Get Encryption Materials, this CMM MUST check whether the Get Encryption Materials Request
contains an algorithm suite.

If it does, this CMM MUST pass the Get Encryption Materials Request to the Underlying CMM,
and output any failure or materials from that Underlying CMM to the caller.

If it does not, this CMM MUST call Get Encryption Materials on the Underlying CMM,
with the following Get Encryption Materials Request:

- Algorithm Suite is the Algorithm Suite ID initialized with this CMM.
- Every other value matches the value in the Get Encryption Materials Request for this call.

This CMM MUST output the result of Get Encryption Materials back to the caller.

On Decrypt Materials, this CMM MUST pass the Decrypt Materials Request to the Underlying CMM,
and output any failure or materials from that Underlying CMM to the caller.

### Legacy

Implementations that supported creating Default CMMs with master key providers prior to this proposal
MUST also support a Default CMM that takes in a master key provider as input.
Any such provided Default CMM MUST return the same composition as the Default CMM that takes a keyring as input,
except it uses [Master Key Provider CMM](#master-key-provider-cmm-2) instead of a Keyring CMM.

Implementations that never supported creating Default CMMs with master key providers MUST NOT
have a Default CMM that accepts a master key provider on input.

#### Master Key Provider CMM

The specification of the Master Key Provider CMM MUST be the specification of the
[legacy Default CMM behavior](https://github.com/awslabs/aws-encryption-sdk-specification/blob/7fb97330a55492592635f05553d66d5e0161a847/framework/default-cmm.md#legacy),
with the following change:

- On Get Encryption Materials, if the Get Encryption Materials Request does not contain an algorithm suite,
  the CMM MUST fail.
