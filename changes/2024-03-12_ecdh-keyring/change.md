[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Elliptic Curve Diffie-Hellman (ECDH) Keyring

## Affected Specifications

N/A

## Definitions

- **AWS ECC KMS Key** :
  A KMS key with an elliptic curve key pair.

- **Ephemeral ECC Key** :
  A short lived ECC Key that lives only for the duration
  of the operation.

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

AWS KMS supports elliptic curve Diffie-Hellman (ECDH) key agreement protocol
on elliptic curve (ECC) KMS key. This allows two parties to establish
a secure communication channel using a shared secret.

Customers do not want to worry about how to correctly use the
shared secret.
Instead, they can rely on the ECDH Keyring to use the shared secret to derive
a shared wrapping key and perform envelope encryption.

This keyring will use a Key Derivation Function with a Psuedo Random Function
to derive a shared wrapping key. This shared wrapping key will be used to encrypt the data key
that performs the data encryption for the customer.

Using the shared wrapping key in this way allows customers to be
able to execute hybrid encryption workflows, where
their data is encrypted by a symmetric key
and the symmetric key is protected by asymmetric keys.

When using a KMS ECDH Keyring, at a minimum a KMS Key ID and the
recipient's public key are needed.
But the recipient public key could be a kms key.

When using a Raw ECDH Keyring, at a minimum you need the sender's private key
and the recipient's public key.

This construction does not adhere to the specification of an
[AWS KMS multikeyring](../../framework/aws-kms/aws-kms-multi-keyrings.md).
In a KMS multikeyring the generator and the children MUST be created with
[aws-kms-keyrings](../../framework/aws-kms/aws-kms-keyring.md).
Since the KMS ECDH Keyring has a different construction,
it MUST NOT be used in a KMS multikeyring.
However; it can be used in a [multikeyring](../../framework/multi-keyring.md).

## Configuration

There are three different configuration settings

1. [Key Agreement Schemes](#key-agreement-schemes)
1. [AWS KMS ECDH Keyring Configuration](#aws-kms-ecdh-keyring-configuration)
1. [Raw ECDH Keyring Configuration](#raw-ecdh-keyring-configuration)

### Key Agreement Schemes

From [NIST 800-56](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Ar3),
the supported schemes involve a combination of ephemeral and static ECC Keys. These are:

- [FullUnifiedModel](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Ar3.pdf#page=81)
- [EphemeralUnifiedModel](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Ar3.pdf#page=89)
- [OnePassUnifiedModel](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Ar3.pdf#page=97)
- [OnePassDiffieHellman](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Ar3.pdf#page=110)
- [StaticUnifiedModel](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Ar3.pdf#page=117)

The keyrings will _ONLY_ support the StaticUnifiedModel Key Agreement Scheme.
We can make this assumption because on configuration we don't have a way of knowing whether
the public key supplied by the recipient is actually an ephemeral key.
Additionally, for the AWS ECDH Keyring the `DeriveSharedSecret` API
has no way of knowing if the public key is an ephemeral key.

### AWS KMS ECDH Keyring Configuration

The ECDH Protocol is executed between two parties.
One is the sender, the other the recipient.

ECDH uses the sender's
private key and the recipient's public key to
calculate the shared secret.

However; when configured with an AWS KMS ECDH Keyring the parties
either have an AWS KMS ECC Key Pair OR they have raw keys.
The "sender" party MUST be AWS KMS, whereas the recipient MAY BE
AWS KMS or a raw key.

| Sender (Private) Keys |
| --------------------- |
| AWS ECC KMS Key       |

| Recipient (Public) Keys |
| ----------------------- |
| AWS ECC KMS Key         |
| Raw ECC Key             |

### Raw ECDH Keyring Configuration

The ECDH Protocol is executed between two parties.
One is the sender, the other the recipient.

ECDH uses the sender's
private key and the recipient's public key to
calculate the shared secret.

However; when using the Raw ECDH Keyring you can
have multiple key configurations.

| Sender (Private) Keys |
| --------------------- |
| Raw ECC Key           |
| Ephemeral ECC Key     |

| Recipient (Public) Keys |
| ----------------------- |
| Raw ECC Key             |
| Ephemeral ECC Key       |

### KDF Configuration

Once a shared secret has been established between
the sender's private key and the recipient's public key,
the shared secret will be used to derive a shared wrapping key
that can be used in hybrid encryption workflows.

The only available option for key derivation is:

- KDF_CTR_HMAC_SHA384:
  [Key Derivation Function in Counter Mode](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1-upd1.pdf)
  with HMAC using Hashing Algorithm SHA 384

## Key Commitment

To confirm that the correct keying material is being used we will
supply a commitment key.
This commitment key will be verified by
the decrypting party by calculating its own commitment key.

If the sender's commitment key and the recipient's key match then
the decrypting party can assert that it is in possession of the
shared wrapping key the sender used.

## Additional Information

The keyring will use the encryption and decryption materials' encryption
context as input to the Key Derivation function as additional information; however,
it will be used in two places.

1. Derivation information as part of the KDF
   - This ensures that the shared wrapping key is cryptographically
     bound to the context of what it will be used for.
1. AAD as part of the data key wrapping
   - As with the other keyrings, the ECDH keyring will use
     the supplied encryption context to also cryptographically bind
     the shared wrapping key to the data key.

Using additional information in this way allows
customers to have authenticated encryption
because the additional information
will have to match in the derivation step
and the data key wrapping/unwrapping step in order to
produce the data key.

## Additional Information vs Encryption Context:

There will be no changes to the public facing API.
So how will customers differentiate between Additional Information
and Encryption Context? Which is used where?

Before wrapping the plaintext data key with the derived shared wrapping key,
the ECDH Keyrings will use the input encryption context and canonicalize it
and use it as additional information into the KDF.

If the keyring succeeds at deriving the shared wrapping key and is ready to wrap the
plaintext data key, it will use the input encryption context as additional
authenticated data (AAD) into the AES-GCM Encrypt operation.

Using the encryption context as both AAD and Additional Information for the KDF
allows us to save message-header space.
