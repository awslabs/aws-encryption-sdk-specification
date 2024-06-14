[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Key Agreement Schemas

## Version

1.0.0

### Changelog

- 1.0.0

  - Initial record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

# Overview

In the ECDH key agreement protocol, there are scenarios where both parties
MAY establish key agreement with more than just their static keys.

Parties MAY use ephemeral keys in addition to static keys. These different
configurations, key-agreement schemas, change how key agreement is established.

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Definitions

### Schema

A set of unambiguously specified transformations that provide a
(cryptographic) service when properly implemented and maintained.
A schema is a higher-level construct than a primitive and a lower-
level construct than a protocol.

### ECDH

ECDH (Elliptic-curve Diffie–Hellman) is a key agreement protocol that
allows two parties, each having an elliptic-curve public–private key
pair, to establish a shared secret over an insecure channel.

This shared secret may be directly used as a key, or to derive another key.

## Supported Key Agreement Schemas

Keyrings that use the ECDH protocol will support the following key agreement schemas:

- [StaticUnifiedModel](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Ar3.pdf#page=117)

This schema does not use any ephemeral keys and treats the key pairs from the sender and
the recipient as static key pairs.

This schema can be configured in different ways since both the AWS KMS ECDH Keyring
and the Raw ECDH Keyring will operate using the same ECDH Key Agreement schema.

Once a shared secret between the two parties has been established, each keyring
will derive keying material according to its specification.

These schema configurations are responsible for correctly
calculating a shared secret, and deriving a shared wrapping key.

Each keyring will derive enough keying material for both a
shared wrapping key, and a commitment key.

### AWS KMS ECDH Key Agreement Schemas

When configured with a AWS KMS ECDH Key Agreement Schema,
at least one party uses KMS to store their private ECC key.
These KMS ECDH Configurations are:

#### KmsPublicKeyDiscovery

On initialization, the caller:

- MUST provide the recipient's AWS KMS key identifier
- MAY provide the recipient's public key
  - Public key MUST be DER-encoded [X.509 SubjectPublicKeyInfo](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1)

On initialization, if the keyring is not configured with
a recipient public key, the keyring MUST call
`kms:GetPublicKey` on the recipient's configured KMS key ID.

If the keyring fails to retrieve the public key, the keyring MUST fail.

If the keyring succeeds retrieving the configured KMS public key,
the `kms:GetPublicKey` response MUST indicate that
the `KeyUsage` on the KMS key ID is for `KeyAgreement` and
that the `Curve` matches the configured curve specification.

This schema is a discovery keyring schema.
This schema can only decrypt messages that are meant
for the decrypting party.
This schema implies that unknown sender public keys are accepted.

If used on encrypt, the keyring MUST fail.

When decrypting a message, the keyring verifies the following:

- MUST verify that the configured recipient's public key
  matches the public key stored on the message ciphertext.

If the conditions are satisfied, then the keyring can continue with
the key agreement schema.

#### KmsPrivateKeyToStaticPublicKey

On initialization, the caller:

- MUST provide the sender's AWS KMS key identifier
- MUST provide the recipient's public key
  - Public key MUST be DER-encoded [X.509 SubjectPublicKeyInfo](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1)
  - If the public key is not DER-encoded the keyring MUST fail.
- MAY provide the sender's public key
  - Public key MUST be DER-encoded [X.509 SubjectPublicKeyInfo](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1)

This schema is able to encrypt and decrypt messages that are meant
to be exchanged between the recipient and receiver.

On initialization, if the keyring is not configured with
a sender public key, the keyring MUST call
`kms:GetPublicKey` on the sender's configured KMS key ID.

If the keyring fails to retrieve the public key, the keyring MUST fail.

If the keyring succeeds retrieving the sender public key, the `kms:GetPublicKey`
response MUST indicate that the `KeyUsage` on the KMS key ID
is for `KeyAgreement` and that the `Curve` matches the configured
curve specification.

On encrypt, the keyring:

- MUST call KMS `DeriveSharedSecret` with the
  sender's KMS key identifier and the recipient's public key.

If the call succeeds, the keyring can continue with the key agreement schema.

On decrypt, the recipient:

- MUST verify that both the configured sender's and recipient's
  public keys match the public keys stored on the message ciphertext.

- If the public keys match the keyring MUST call KMS `DeriveSharedSecret`.

If the conditions are satisfied, then the keyring can continue with
the key agreement schema.

### Raw ECDH Key Agreement Schemas

When configured with a Raw ECDH Key Agreement Schema,
the sender party MAY be using an ephemeral key or a static key,
and the recipient is always static.

#### EphemeralPrivateKeyToStaticPublicKey

On initialization, the caller:

- MUST provide the recipient's public key
  - Public key MUST be DER-encoded [X.509 SubjectPublicKeyInfo](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1)
  - If the public key is not DER-encoded the keyring MUST fail.

This schema can only encrypt data and MUST NOT be used
for decryption.
If used on decrypt, the keyring MUST fail.

The recipient's public key MAY belong to a KMS key.
Although, there is no way to actively check if the public key belongs to
a KMS key.

On encrypt, the keyring:

- MUST generate a new ECC key pair along the same EC curve as
  the recipient's public key. If the keyring is not able to generate a
  new ECC key pair, the keyring MUST fail. Otherwise, the keyring
  can continue with the key agreement schema.

On decrypt, the keyring MUST fail.

If the conditions are satisfied, then the keyring can continue with
the key agreement schema.

#### PublicKeyDiscovery

On initialization, the caller:

- MUST provide the recipient's static private key
  - Private key MUST be PEM encoded [PKCS #8 PrivateKeyInfo structures](https://tools.ietf.org/html/rfc5958#section-2)
  - If the private key is not PEM-encoded the keyring MUST fail.

This schema is not used to encrypt as there is no sender
public key.

On encrypt, the keyring MUST fail.

On decrypt, the keyring:

- MUST verify that the recipient public key stored on
  the message ciphertext matches the configured recipient's
  public key.

If the conditions are satisfied, then the keyring can continue with
the key agreement schema.

#### RawPrivateKeyToStaticPublicKey

On initialization, the caller:

- MUST provide the sender's static private key
  - Private key MUST be PEM encoded [PKCS #8 PrivateKeyInfo structures](https://tools.ietf.org/html/rfc5958#section-2)
  - If the private key is not PEM-encoded the keyring MUST fail.
- MUST provide the recipient's public key
  - Public key MUST be DER-encoded [X.509 SubjectPublicKeyInfo](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1)
  - If the public key is not DER-encoded the keyring MUST fail.

This schema is able to encrypt and decrypt messages that are meant
to be exchanged between the recipient and receiver.

On encrypt, the keyring:

- MUST generate the shared secret with the sender's
  private key and the recipient's public key

On decrypt, the keyring:

- MUST verify that both the configured sender's and recipient's
  public keys match the public keys stored on the message ciphertext.

If the conditions are satisfied, then the keyring can continue with
the key agreement schema.

## Key Derivation

All schemas perform key derivation.

The keyring MUST attempt to derive a shared wrapping key from the shared secret.

Before deriving a shared wrapping key,
the keyring MUST generate a 32 byte random salt value.

If the keyring fails to generate a random value, the operation MUST fail.

The keyring uses the following as inputs to the Key Derivation Function:

- MUST use the derived shared secret, Z
- OtherInput:
  - L: MUST be a length of 512 bits
  - salt: MUST be a random 32 byte string
  - IV: MUST be null
  - FixedInfo:
    - MUST be the UTF8 encoded string "ecdh-key-derivation"
    - MUST be the UTF8 encoded string of the configured curve specification
    - MUST be the UTF8 encoded string of the configured Key Derivation Method used
    - MUST be A concatenation of the static public keys used by the parties
      in the format of sender followed by receiver
    - MUST be The canonicalized encryption context found in the [encryption materials](structures.md#encryption-materials)
    - MUST use a null byte concatenating all the fixed info fields.
    - MUST use the keyring version found in the key provider information.

The FixedInfo field MUST be serialized in the following order:

```
UTF8("ECDH-KEY-DERIVATION")||'0x00'|| UTF8(curve_spec)||'0x00'||UTF8("HMAC_SHA384")||'0x00'||(PKU || PKV)||'0x00'||'0x01'||'0x00'||canonicalized(EC)
```

The canonicalized encryption context is the last value in the
serialized FixedInfo since this is a variable value.
The information before the canonicalized
encryption context remains static between
the encrypt and decrypt operation.

In between operations the encryption context value
may change.

## Key Commitment

With these configurations, the encrypting party is always responsible
for providing enough entropy in the key derivation operation in order to
produce a uniformly random data key across the data key space.

Since the encrypt and decrypt operations are NOT interactive operations,
the decrypting party is concerned that at decrypt time they are in possession
of the correct keying material that protect the data encryption key.

In order to provide this assurance, the keyrings supply a commitment key
that the decrypting party verifies at decrypt time. If the calculated
commitment key is equal to the commitment key stored on the
message ciphertext, the decrypting party obtains assurance that
they have derived the correct keying material. This equality check
MUST be a constant time operation.
