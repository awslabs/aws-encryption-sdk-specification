[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Interacting with AWS KMS ECDH API using the AWS Cryptographic Material Providers Library (MPL) (Background)

## Definitions

### ECDH

ECDH (Elliptic-curve Diffie–Hellman) is a key agreement protocol that
allows two parties, each having an elliptic-curve public–private key
pair, to establish a shared secret over an insecure channel.

This shared secret may be directly used as a key, or to derive another key.

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Issues and Alternatives

## Why is the MPL adding support for the ECDH API?

The ECDH API will produce the cryptographic primitive shared secret
that is calculated from the ECDH exchange between the sender's
private key and the recipient's public key.

Customers need an out of box solution that will "just work"
with AWS Crypto Tools products such as the AWS Encryption SDK
and the AWS Database Encryption SDK, without having to worry
about using the shared secret correctly.

## How is the MPL going to support this new ECDH operation?

By introducing a new keyring that will accept a sender's
private key and a recipient's public key, the keyring will
be able to calculate the ECDH shared secret or delegate the
operation to AWS KMS.

Once a shared secret has been established, a plaintext
shared wrapping key will be derived from the shared secret such that
it can be used in hybrid encryption workflows.

It is a common use case to derive a shared wrapping key
from the shared secret. The derivation of a shared
data key from a shared secret established by ECDH
is specified by [NIST 800-56A 4.2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Ar3.pdf)

## How many Keyrings does this feature require?

Two keyrings will be introduced.

- [Raw ECDH Keyring](../../framework/raw-ecdh-keyring.md)
- [AWS KMS ECDH Keyring](../../framework/aws-kms/aws-kms-ecdh-keyring.md)

## What kind of configurations can we expect if we plan on using an AWS KMS ECDH Keyring?

The ECDH Keyrings have [schemas](../../framework/key-agreement-schemas.md) as part of their configurations.
These schemas tell the keyring how the parties' ECC keys are presented.

See each keyring's specification for their supported schemas.

- [AWS KMS ECDH Keyring](../../framework/aws-kms/aws-kms-ecdh-keyring.md)
- [Raw ECDH Keyring](../../framework/raw-ecdh-keyring.md)

## How can customers know they are using the correct shared wrapping key for envelope encryption?

In order to confirm that customers are using the correct shared wrapping key,
we will provide a commitment key.

Adding a commitment key allows the decrypting party to verify they
are in possession of correct keying material.

This also provides for future compatibility with other systems that
also provide a commitment key. This key may be used
as a key for key commitment, symmetric signature, key confirmation,
or other protocol specific applications.

As is, the keyring implementation cannot support key confirmation.
In key confirmation you compare a MAC message as opposed to a commitment key.
However; the cryptographic primitives exist in the library
such that it is easy to add functionality to perform key confirmation.

## How much entropy is used for the Key Derivation and for the data key wrapping?

The keyrings will use a 32 byte random nonce
every time a shared wrapping key is derived.
Using a new 32 byte random value every time
pretty much guarantees a unique shared wrapping key
on every encrypt operation.

This key is only ever used once in the keyrings.
Due to this, we do need need to add an additional
distinct random IV in the AES-GCM wrapping operation.
This effectively means that there is no "built-in"
support for a rotation. If you were to use the shared
wrapping key for more than one encrypt operation, the IV
in the AES GCM operation allows us to extend the "life" of the
shared wrapping key by generating a unique random IV every time
while the shared wrapping key is the same.

We believe that our use case only needs to use the shared wrapping
key once. However; if we ever need to support doing
additional encryption operations with the shared wrapping key,
we can distinguish that through the version value serialized
in the key provider information.

## Other Considerations

1. Public Key Validation

   1. Which Crypto Provider should do this? Is it in the threat model
      to validate the correct construction of the public key such that its
      parameters matches those of the sender's private key?

1. Which Key Derivation Function should be supported?

   1. KDF-CTR?
      1. We will support KDF in Counter Mode as it is a KDF that is supported
         by both Crypto Tools and AWS KMS.

1. Which Key Derivation Methods (KDM) should be supported?
   With any KDM, we MUST keep in mind that adding new support should be easy for customers.

   1. Hash: Supporting a Hash based KDM is straightforward and most customers expect an easy default.
   1. HMAC: HMAC may also be a suitable choice. We would have to keep in mind that not only do you need
      HMAC functionality but you also need to support an approved hashing function.
   1. KMAC: Crypto Tools hasn't had requests to support this method, so we can leave it off
      the table; however it should be trivial and non-breaking to add in the future.

1. How many Keyrings does this feature require?

   1. This feature _could_ fit all in one keyring. Following the
      team's precedent, splitting them into a "Raw" and a "AwsKMS" Keyring makes
      the most sense.

1. ECDH Hierarchy Keyring
   1. Crypto Tools has introduced the AWS KMS Hierarchical Keyring as an option
      to reduce KMS network calls every encrypt and decrypt to every "x" minutes.
      This plays nicely with customers that want KMS security without having to
      call KMS every time. The hierarchy keyring does this by creating a key hierarchy
      where one KMS key sits at the top and customers protect data under that key by
      deriving data keys from the KMS key.
   1. For customer that want to go even faster having an ECDH Hierarchy Keyring can
      be an attractive option. Consider the following; you have "n" hosts, each call KMS
      to get an ECC KeyPair. Out of those "n" hosts, there is one admin host that is going
      to be the admin. This admin host can establish a keystore with the other hosts by using
      their public keys. Now, this becomes an interesting use case because each host can establish
      the same hierarchy by establishing the shared secret, once established the hosts can go off
      and rotate their "branch keys" by introducing new raw ECC public keys or ephemeral ECC keys.
   1. This hierarchy feature is out of scope for these new keyrings but it is worth keeping it in mind.
