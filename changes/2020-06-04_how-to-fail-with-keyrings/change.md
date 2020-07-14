[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# How to fail with Keyrings in the AWS Encryption SDK

## Affected Features

This serves as a reference of all features that this change affects.

| Feature                                                                                                |
| ------------------------------------------------------------------------------------------------------ |
| [Keyring Failure Communication](https://github.com/awslabs/aws-encryption-sdk-specification/issues/40) |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                                             |
| --------------------------------------------------------- |
| [Keyring Interface](../../framework/keyring-interface.md) |

## Affected Implementations

The scope of this change only affects the specification.
Follow-up changes that define how this change
affects specific keyring specifications
will affect implementations.

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

In order to define when keyrings MUST fail,
we define a new concept of the "decryption contract",
how it applies to keyrings generally,
and how it is used to determine when keyrings MUST fail.

## Out of Scope

- The specifics of how ESDK components
  communicate failure information between themselves
  is out of scope.
  We will address this in future specification changes.

- The specific nature of _how_ ESDK framework components indicate failure
  is out of scope.
  That will depend on the best practices for each language.

- Defining the decryption contract for each keyring
  is out of scope.
  We will address this in future specification changes.

- A mechanism to interrogate a keyring
  to determine the properties of its decryption contract
  is out of scope.
  We SHOULD address this in future changes.

- This change only applies to keyrings.
  We SHOULD define analogous concepts for
  cryptographic materials managers
  and the AWS Encryption SDK client
  in future changes.

## Motivation

We lack a consistent definition both of
what it means for a keyring to fail
and what causes a keyring to fail.
Without this consistent definition,
different keyrings and implementations
do slightly different things,
leading to implementation drift
and confusion for users and implementors.

In order to clarify this situation,
we MUST first define what it means for a keyring to fail,
and that means defining what it means for a keyring to succeed.
To do this,
we define a new concept of the
"keyring decryption contract".

## Drawbacks

This change SHOULD not introduce any drawbacks.
It is simplifying and clarifying
a relationship that already exists
in the specification
and clearly defining
how that relationship affects behavior.

## Security Implications

The keyring decryption contract
simplifies the definition of
the security properties of a keyring
and provides a consistent way to describe
the security properties of each keyring.

## Operational Implications

Clearly defining what causes keyrings to fail
makes it simpler for users to predict failing behavior
in different environments and implementations.

## Guide-level Explanation

On encryption,
a keyring creates an artifact:
one or more encrypted data keys.
This artifact has certain requirements that
MUST be met on decryption
in order to obtain the plaintext data key.
This set of requirements,
manifested as the artifact,
is what we call the "keyring decryption contract."

## Reference-level Explanation

### Definitions and Terms

- **decryption contract** :
  This refers to a set of requirements
  that MUST be satisfied in order to obtain
  the plaintext data key.

- **decryption contract artifact** :
  One or more encrypted data keys,
  bound to a decryption contract,
  that enable a keyring to obtain a plaintext data key
  after meeting decryption contract's requirements.

- **writing the decryption contract** :
  The process of taking the plaintext data key
  and successfully creating a
  decryption contract artifact.

- **fulfilling the decryption contract** :
  The process of taking a decryption contract artifact
  and successfully obtaining the plaintext data key.

### How to Fail

On encryption,
if a keyring is unable or unwilling to
write its decryption contract,
that keyring MUST fail.

On decryption,
if a keyring is unable or unwilling to
fulfill any decryption contract
using the artifacts that it receives,
that keyring MUST fail.

### Application to Keyring Specifications

Each keyring specification MUST define
what decryption contract it writes on encrypt
and what decryption contract it can fulfill on decrypt.
These MAY be the same contract.

The decryption contracts for each keyring
will be defined in separate changes,
but as a descriptive example,
they might look something like this:

- Raw RSA keyring

  - The decrypting keyring MUST have access to decrypt
    using the private wrapping key.

- Raw AES keyring

  - The decrypting keyring MUST have access to decrypt
    using the symmetric wrapping key.
  - The encryption context MUST exactly match
    the encryption context used on encrypt.

    - NOTE: In compliant implementations this is a MUST,
      but mathematically this is a SHOULD
      because it is possible to create a keyring
      that ignores this clause in the decryption contract
      by using AES-CTR rather than AES-GCM.

- Multi-keyring

  - Fulfilling any member keyring's decryption contract
    MUST be sufficient to fulfill
    the multi-keyring's decryption contract.

- AWS KMS keyring (single CMK)

  - The decrypting keyring MUST have access to
    an AWS KMS client that is configured with credentials for
    an AWS principal that passes a `kms:Decrypt` authorization check
    for the encrypted data key.
  - The encryption context MUST exactly match
    the encryption context used on encrypt.
  - NOTE: These properties are supplied by AWS KMS.
    The AWS KMS keyring is simply a conduit to AWS KMS.

- AWS KMS discovery keyring

  - The AWS KMS discovery keyring is unable to write a decryption contract.
  - The AWS KMS discovery keyring MAY fulfill any AWS KMS decryption contract
    within its configured AWS region.

    - NOTE: Successfully fulfilling an AWS KMS decryption contract
      depends on access to credentials for an AWS principal
      with the necessary permission
      to pass a `kms:Decrypt` authorization check
      for the encrypted data key.

  - Fulfilling any AWS KMS decryption contract
    MUST be sufficient to fulfill
    the AWS KMS discovery keyring's decryption contract.
