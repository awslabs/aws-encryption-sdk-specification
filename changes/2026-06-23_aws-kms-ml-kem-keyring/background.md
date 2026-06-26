[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Interacting with the AWS KMS ML-KEM API using the AWS Cryptographic Material Providers Library (MPL) (Background)

## Definitions

### ML-KEM

ML-KEM (Module-Lattice-Based Key Encapsulation Mechanism) is a
[NIST-standardized Key Encapsulation Mechanism](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf)
designed to resist attack by both classical and quantum adversaries.

A Key Encapsulation Mechanism is a public-key primitive defined by three operations:

- `KeyGen` produces an `(encapsulation key, decapsulation key)` pair.
- `Encapsulate(public key)` produces a `(ciphertext, shared secret)` pair,
  where the shared secret is a fresh random 32-byte value.
- `Decapsulate(private key, ciphertext)` recovers the same shared secret.

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Issues and Alternatives

## Why is the MPL adding support for ML-KEM?

The AWS Encryption SDK's body cipher (AES-GCM) is quantum-resistant,
but the asymmetric mechanisms today used to wrap symmetric data keys
(RSA and ECC inside AWS KMS) are not.
An adversary who records ESDK ciphertexts today can attempt to decrypt them
later if a cryptographically-relevant quantum computer becomes available —
the "harvest now, decrypt later" threat.

NIST has standardized ML-KEM (FIPS 203) as the algorithm of choice for
post-quantum key encapsulation.
AWS KMS exposes ML-KEM through new `Encapsulate` and `Decapsulate` APIs.

Adding a keyring that uses ML-KEM lets customers migrate envelope encryption
to a quantum-resistant primitive without any change to the message format,
the algorithm suites, the body cipher, or any other keyring.

## How is the MPL going to support ML-KEM?

By introducing a new AWS KMS ML-KEM Keyring that:

1. Establishes a fresh per-message 32-byte shared secret using ML-KEM
   (either via AWS KMS `Encapsulate` or locally against the ML-KEM public key).
2. Derives an AES-GCM wrapping key from that shared secret using a KDF
   that binds the AWS KMS key ARN, a keyring version byte, and the canonicalized
   encryption context as `FixedInfo`.
3. AES-GCM-wraps the plaintext data key under the wrapping key,
   using the same `FixedInfo` as Additional Authenticated Data.

The encrypted data key carries the KEM ciphertext, the salt, and the AES-GCM
output (encrypted key + authentication tag).
Decryption recovers the shared secret via AWS KMS `Decapsulate`,
re-derives the wrapping key, and unwraps the data key.

## How many keyrings does this feature require?

One keyring for the initial release: the AWS KMS ML-KEM Keyring.

A future Raw ML-KEM Keyring that holds the ML-KEM key material locally
and performs both encapsulation and decapsulation in-process
(mirroring the existing Raw RSA Keyring)
is plausible but is not required for the primary stakeholder use case
(migrating off KMS RSA while keeping keys in KMS),
and is therefore out of scope.

## Why is encapsulation configurable but decapsulation always KMS-backed?

Encapsulation requires only the ML-KEM public key,
so it can run anywhere the public key is available.
Decapsulation requires the ML-KEM private key.

Keeping decapsulation in AWS KMS keeps the ML-KEM private key in KMS custody,
preserving KMS access control, audit, and rotation.
Allowing encapsulation to run locally removes the per-message KMS call
and the `kms:Encapsulate` permission requirement from the encrypt path,
which is the asymmetric capability ML-KEM provides over a symmetric KMS keyring.

Both encapsulation sources use the same ML-KEM key pair and produce a
byte-identical encrypted data key,
so ciphertexts produced by either source decrypt through the same KMS-backed
decrypt path.

## Why no explicit key commitment value?

The existing ECDH keyrings derive 64 bytes of keying material
and use the first 32 bytes as a commitment key stored alongside the wrapped data key.
The decryptor recomputes the commitment key and constant-time-compares.

For this keyring, tampering is detected by two existing mechanisms
without a separate commitment value:

1. The AES-GCM authentication tag of the data key wrap fails
   whenever the encrypted data key, the salt, or the encryption context
   is modified — because all of those feed the `FixedInfo` used both as KDF input
   and as AES-GCM AAD.
2. ML-KEM's implicit rejection ensures that decapsulating an invalid
   KEM ciphertext returns a pseudo-random shared secret rather than an error,
   which deterministically derives a wrong wrapping key.

A separate commitment value would be redundant given those two mechanisms.

## How much entropy is used for the key derivation and the data key wrap?

The KDF receives the 32-byte ML-KEM shared secret as input keying material,
which is a fresh random 32-byte value per message.
The keyring additionally generates a fresh 32-byte random salt per message,
which is carried in the encrypted data key.

Because each message has a unique wrapping key,
the keyring uses a fixed (zeroed) 12-byte AES-GCM IV
without violating AES-GCM nonce uniqueness across messages.

## How does this interact with multi-keyrings?

The keyring is usable inside a generic `multi-keyring`.

The keyring MUST NOT be used inside an `aws-kms-multi-keyring`,
because an `aws-kms-multi-keyring` requires its generator and children to be
plain AWS KMS keyrings (symmetric `GenerateDataKey` / `Encrypt` / `Decrypt`),
whose construction differs from this keyring (`Encapsulate` / `Decapsulate`).

## Other Considerations

1. Cached shared-secret reuse.

   1. The keyring could amortize KMS calls by calling `Encapsulate` once and
      reusing the shared secret across many messages (with a fresh salt per message).
      This is deferred because it makes the keyring stateful and introduces
      cross-message linkability (messages sharing a cached secret carry the same
      `SharedSecretCiphertextBlob`).

1. Cross-language implementations.

   1. The initial release targets Java only.
      Adding implementations in other ESDK languages is straightforward provided
      the wire format and KDF construction defined in the keyring specification
      are followed exactly.

1. Raw ML-KEM Keyring.

   1. A Raw ML-KEM Keyring that also performs decapsulation locally
      (mirroring `RawRSAKeyring`) is plausible future work,
      but moves the ML-KEM private key out of KMS custody,
      which contradicts the primary stakeholder requirement of keeping keys in KMS.

1. Local encapsulation provider.

   1. Local encapsulation requires a local ML-KEM provider.
      Candidates include AWS-LC, BouncyCastle, and ACCP.
      The keyring is agnostic to the choice;
      the requirement is correctness of `Encapsulate` against the ML-KEM public key
      and use of a cryptographically secure random source.

1. ML-KEM parameter set selection.

   1. Each ML-KEM KMS key has a fixed parameter set
      (`ML-KEM-512`, `ML-KEM-768`, or `ML-KEM-1024`).
      The keyring requires the customer to declare the parameter set at construction
      so the deserializer can split the variable-length KEM ciphertext from the
      following salt and wrap.
