[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Algorithm Suites

## Version

0.3.0

### Changelog

- 0.3.0
  - [Material Providers Library (MPL)](../changes/2022-06-19_seperate_material_providers/change.md)

## Implementations

| Language   | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                                            |
| ---------- | -------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C          | 0.1.0                                  | n/a                       | [cipher.c](https://github.com/awslabs/aws-encryption-sdk-c/blob/master/source/cipher.c)                                                                   |
| NodeJS     | 0.1.0                                  | n/a                       | [node_algorithms.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management/src/node_algorithms.ts)             |
| Browser JS | 0.1.0                                  | n/a                       | [web_crypto_algorithms.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management/src/web_crypto_algorithms.ts) |
| Python     | 0.1.0                                  | n/a                       | [identifiers.py](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/identifiers.py)                                      |
| Java       | 0.1.0                                  | n/a                       | [CryptoAlgorithm.java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/CryptoAlgorithm.java)         |
| Java       | 0.1.0                                  | n/a                       | [AlgorithmSuites.dfy](https://github.com/aws/aws-encryption-sdk-dafny/blob/mainline/src/AwsCryptographicMaterialProviders/AlgorithmSuites.dfy)            |

## Overview

An algorithm suite is a collection of cryptographic algorithms and related values.
The algorithm suite defines the behaviors the AWS Encryption SDK MUST follow for cryptographic operations.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### AES

Specification: [NIST FIPS 297](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf)

The Advanced Encryption Standard (AES) is a symmetric block cipher encryption algorithm.

### GCM

Specification: [NIST Special Publication 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)

Galois/Counter Mode is a mode of operation for block ciphers that provides authenticated encryption with additional data (AEAD).

If specified to use GCM, the AWS Encryption SDK MUST use GCM with the following specifics:

- The internal block cipher is the encryption algorithm specified by the algorithm suite.

### CBC

Specification: [NIST Special Publication 800-38A](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-38a.pdf)

Cipher Block Chaining is a mode of operation for symmetric key block ciphers that provides data confidentiality but does not provide authenticated encryption.

If specified to use CBC, the S3 Encryption Client MUST use CBC with the following specifics:

- CBC MUST only be used to decrypt existing ciphertexts.
- CBC MUST NOT be used to encrypt new ciphertexts.

### CTR

Specification: [NIST Special Publication 800-38A](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-38a.pdf)

Counter is a mode of operation for symmetric key block ciphers that provides data confidentiality but does not provide authenticated encryption.

If specified to use CTR, the S3 Encryption Client MUST use CTR with the following specifics:

- CTR MUST only be used to decrypt existing ciphertexts.
- CTR MUST NOT be used to encrypt new ciphertexts.

### Identity KDF

The identity key derivation function (Identity KDF) is a key derivation algorithm.

The Identity KDF MUST take a byte sequence as input,
and MUST return the input, unchanged, as output.

If included in the algorithm suite,
the algorithm suite's encryption key length MUST equal the algorithm suite's [key derivation input length](#key-derivation-input-length).

### HKDF

Specification: [RFC 5869](https://tools.ietf.org/html/rfc5869)

The HMAC-based extract-and-expand key derivation function (HKDF) is a key derivation algorithm.

## Supported Libraries

The following tables includes the dependant libraries
supported by the Material Providers Library.
Both short and long name MUST be unique.

| Library (long name)  | Library (short name) |
| -------------------- | -------------------- |
| AWS Encryption SDK   | ESDK                 |
| S3 Encryption Client | S3EC                 |

## Supported Library Algorithm Suites ENUM

The following tables includes the algorithm suites
supported by the Material Providers Library
for each [supported library](./algorithm-suites.md#supported-libraries).
The Material Providers Library MUST provide
a set of algorithm suite ENUM for each [supported library](./algorithm-suites.md#supported-libraries).

| ESDK Algorithm Suite ENUM                         |
| ------------------------------------------------- |
| ALG_AES_128_GCM_IV12_TAG16_NO_KDF                 |
| ALG_AES_192_GCM_IV12_TAG16_NO_KDF                 |
| ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 |
| ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256            |
| ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA256            |
| ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA256            |
| ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256_ECDSA_P256 |
| ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 |
| ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 |
| ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY            |
| ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY_ECDSA_P384 |

| S3 EC Algorithm Suite ENUM        |
| --------------------------------- |
| ALG_AES_256_CBC_IV16_NO_KDF       |
| ALG_AES_256_CTR_IV16_TAG16_NO_KDF |
| ALG_AES_256_GCM_IV12_TAG16_NO_KDF |

## Supported Algorithm Suites ENUM

The Material Providers Library MUST provide
an ENUM that is the super set of all the [supported library algorithm suites enum](#supported-library-algorithm-suites-enum)
called the Algorithm Suite ENUM.
In this specification this Algorithm Suite ENUM
will be denoted as `Library.LibraryENUM`
to uniquely identify an Algorithm Suite ENUM across all supported libraries.
For example `ESDK.ALG_AES_128_GCM_IV12_TAG16_NO_KDF`
is the Algorithm Suite ENUM for the ESDK Algorithm Suite ENUM `ALG_AES_128_GCM_IV12_TAG16_NO_KDF`.
This means that different libraries MAY have duplicate Library Algorithm Suite ENUM.

| Algorithm Suite ENUM                                   |
| ------------------------------------------------------ |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY_ECDSA_P384 |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY            |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256_ECDSA_P256 |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA256            |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA256            |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256            |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_NO_KDF                 |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_NO_KDF                 |
| S3EC.ALG_AES_256_CBC_IV16_NO_KDF                       |
| S3EC.ALG_AES_256_CTR_IV16_TAG16_NO_KDF                 |
| S3EC.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 |

## Supported Algorithm Suites

The following table includes the algorithm suites supported by the AWS Encryption SDK.
The value `00 00` is reserved
and MUST NOT be used
as an Algorithm Suite ID in the future.
Algorithm Suite ID MUST be a unique hex value across all [supported algorithm suites](#supported-algorithm-suites).

| Algorithm Suite ENUM                                   | Algorithm Suite ID (hex) | Message Format Version | Algorithm Suite Data Length (bytes) |
| ------------------------------------------------------ | ------------------------ | ---------------------- | ----------------------------------- |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY_ECDSA_P384 | 05 78                    | 2.0                    | 32                                  |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY            | 04 78                    | 2.0                    | 32                                  |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | 03 78                    | 1.0                    | N/A                                 |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | 03 46                    | 1.0                    | N/A                                 |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256_ECDSA_P256 | 02 14                    | 1.0                    | N/A                                 |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA256            | 01 78                    | 1.0                    | N/A                                 |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA256            | 01 46                    | 1.0                    | N/A                                 |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256            | 01 14                    | 1.0                    | N/A                                 |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | 00 78                    | 1.0                    | N/A                                 |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_NO_KDF                 | 00 46                    | 1.0                    | N/A                                 |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_NO_KDF                 | 00 14                    | 1.0                    | N/A                                 |
| S3EC.ALG_AES_256_CBC_IV16_NO_KDF                       | 00 70                    | 1.0                    | N/A                                 |
| S3EC.ALG_AES_256_CTR_IV16_TAG16_NO_KDF                 | 00 71                    | 1.0                    | N/A                                 |
| S3EC.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | 00 72                    | 1.0                    | N/A                                 |

## Algorithm Suites Encryption Key Derivation Settings

The following table includes key derivation information for supported algorithm suites.

| Algorithm Suite ENUM                                   | Key Derivation Input Length (bits) | Algorithm    | Hash Function | Salt Length (bits) | Key Commitment |
| ------------------------------------------------------ | ---------------------------------- | ------------ | ------------- | ------------------ | -------------- |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY_ECDSA_P384 | 256                                | HKDF         | SHA-512       | 256                | True           |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY            | 256                                | HKDF         | SHA-512       | 256                | True           |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | 256                                | HKDF         | SHA-384       | 0                  | False          |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | 192                                | HKDF         | SHA-384       | 0                  | False          |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256_ECDSA_P256 | 128                                | HKDF         | SHA-256       | 0                  | False          |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA256            | 256                                | HKDF         | SHA-256       | 0                  | False          |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA256            | 192                                | HKDF         | SHA-256       | 0                  | False          |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256            | 128                                | HKDF         | SHA-256       | 0                  | False          |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | 256                                | Identity KDF | N/A           | 0                  | False          |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_NO_KDF                 | 192                                | Identity KDF | N/A           | 0                  | False          |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_NO_KDF                 | 128                                | Identity KDF | N/A           | 0                  | False          |
| S3EC.ALG_AES_256_CBC_IV16_NO_KDF                       | 256                                | Identity KDF | N/A           | 0                  | False          |
| S3EC.ALG_AES_256_CTR_IV16_TAG16_NO_KDF                 | 256                                | Identity KDF | N/A           | 0                  | False          |
| S3EC.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | 256                                | Identity KDF | N/A           | 0                  | False          |

## Algorithm Suites Encryption Settings

The following table includes the encryption settings for supported algorithm suites.

| Algorithm Suite ENUM                                   | Encryption Algorithm | Encryption Algorithm Mode | Encryption Key Length (bits) | IV Length (bytes) | Authentication Tag Length (bytes) |
| ------------------------------------------------------ | -------------------- | ------------------------- | ---------------------------- | ----------------- | --------------------------------- |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY_ECDSA_P384 | AES                  | GCM                       | 256                          | 12                | 16                                |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY            | AES                  | GCM                       | 256                          | 12                | 16                                |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | AES                  | GCM                       | 256                          | 12                | 16                                |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | AES                  | GCM                       | 192                          | 12                | 16                                |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256_ECDSA_P256 | AES                  | GCM                       | 128                          | 12                | 16                                |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA256            | AES                  | GCM                       | 256                          | 12                | 16                                |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA256            | AES                  | GCM                       | 192                          | 12                | 16                                |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256            | AES                  | GCM                       | 128                          | 12                | 16                                |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | AES                  | GCM                       | 256                          | 12                | 16                                |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_NO_KDF                 | AES                  | GCM                       | 192                          | 12                | 16                                |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_NO_KDF                 | AES                  | GCM                       | 128                          | 12                | 16                                |
| S3EC.ALG_AES_256_CBC_IV16_NO_KDF                       | AES                  | CBC                       | 256                          | 16                | N/A                               |
| S3EC.ALG_AES_256_CTR_IV16_TAG16_NO_KDF                 | AES                  | CTR                       | 256                          | 16                | N/A                               |
| S3EC.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | AES                  | GCM                       | 256                          | 12                | 16                                |

## Algorithm Suites Commit Key Derivation Settings

The following table includes commitment information for supported algorithm suites.
These values are only relevant to algorithm suites that support [key commitment](#key-commitment).

| Algorithm Suite ENUM                                   | Key Derivation Input Length (bits) | Algorithm | Hash Function | Salt Length (bits) |
| ------------------------------------------------------ | ---------------------------------- | --------- | ------------- | ------------------ |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY_ECDSA_P384 | 256                                | HKDF      | SHA-512       | 256                |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY            | 256                                | HKDF      | SHA-512       | 256                |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | N/A                                | N/A       | N/A           | N/A                |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | N/A                                | N/A       | N/A           | N/A                |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256_ECDSA_P256 | N/A                                | N/A       | N/A           | N/A                |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA256            | N/A                                | N/A       | N/A           | N/A                |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA256            | N/A                                | N/A       | N/A           | N/A                |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256            | N/A                                | N/A       | N/A           | N/A                |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | N/A                                | N/A       | N/A           | N/A                |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_NO_KDF                 | N/A                                | N/A       | N/A           | N/A                |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_NO_KDF                 | N/A                                | N/A       | N/A           | N/A                |
| S3EC.ALG_AES_256_CBC_IV16_NO_KDF                       | N/A                                | N/A       | N/A           | N/A                |
| S3EC.ALG_AES_256_CTR_IV16_TAG16_NO_KDF                 | N/A                                | N/A       | N/A           | N/A                |
| S3EC.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | N/A                                | N/A       | N/A           | N/A                |

## Algorithm Suites Signature Settings

The following table includes signature information for supported algorithm suites.

| Algorithm Suite ENUM                                   | Signature Algorithm          |
| ------------------------------------------------------ | ---------------------------- |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY_ECDSA_P384 | ECDSA with P-384 and SHA-384 |
| ESDK.ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY            | Not applicable               |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | ECDSA with P-384 and SHA-384 |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA384_ECDSA_P384 | ECDSA with P-384 and SHA-384 |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256_ECDSA_P256 | ECDSA with P-256 and SHA-256 |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_HKDF_SHA256            | Not applicable               |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_HKDF_SHA256            | Not applicable               |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_HKDF_SHA256            | Not applicable               |
| ESDK.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | Not applicable               |
| ESDK.ALG_AES_192_GCM_IV12_TAG16_NO_KDF                 | Not applicable               |
| ESDK.ALG_AES_128_GCM_IV12_TAG16_NO_KDF                 | Not applicable               |
| S3EC.ALG_AES_256_CBC_IV16_NO_KDF                       | Not applicable               |
| S3EC.ALG_AES_256_CTR_IV16_TAG16_NO_KDF                 | Not applicable               |
| S3EC.ALG_AES_256_GCM_IV12_TAG16_NO_KDF                 | Not applicable               |

## Structure

The fields described below are REQUIRED to be specified by algorithm suites, unless otherwise specified.

### Algorithm Suite ENUM

A value that uniquely identifies an algorithm suite.

### Algorithm Suite ID

A 2-byte hex value that MUST uniquely identify an algorithm suite.
This 2-byte value SHOULD be used to bind algorithm suites to ciphertext.

### Encryption Algorithm

The block cipher encryption algorithm.

The length of the input encryption key MUST equal the [encryption key length](#encryption-key-length) specified by the algorithm suite.

#### Supported Encryption Algorithms

- [AES](#aes)

### Encryption Algorithm Mode

The AEAD operation mode used with the encryption algorithm.

The length of the input IV MUST equal the IV length specified by the algorithm suite.
The length of the authentication tag MUST equal the authentication tag length specified by the algorithm suite.

#### Supported Encryption Algorithm Modes

- [GCM](#gcm)
- [CBC](#cbc) - legacy, decrypt-only
- [CTR](#ctr) - legacy, decrypt-only

### Encryption Key Length

The length of the encryption key used as input to the encryption algorithm.

### IV Length

The length of the initialization vector (IV) used with the encryption algorithm.

### Authentication Tag Length

The length of the authentication tag used with AEAD.

### Encryption Key Derivation Algorithm

This key derivation algorithm defines what key derivation function (KDF) to use for encryption key generation.
The specified KDF algorithm MUST be used to generate the encryption algorithm encryption key input.

#### Supported Encryption Key Derivation Algorithms

- [Identity KDF](#identity-kdf)
- [HKDF](./transitive-requirements.md#hkdf-encryption-key)

### Key Derivation Input Length

The length of the input to the Key Derivation Algorithm.

### Key Commitment

AES-GCM is not key committing by default.
Key commitment is a property,
which ensures that exactly one data key can be used to decrypt a ciphertext.
However, not all algorithm suites provide this property.

#### Supported Key Commitment Values

- True
- False

### Commit Key

A key that is used to provide [key commitment](#key-commitment) to AES-GCM.

### Commit Key Derivation Algorithm

This key derivation algorithm defines what key derivation function (KDF) to use for commitment key generation.
The specified KDF algorithm MUST be used to generate the [commit key](#commit-key).

#### Supported Commit Key Derivation Algorithm

- [HKDF](./transitive-requirements.md#hkdf-commit-key)

### Commit Key Length

The length of the commit key used to verify [key commitment](#key-commitment).

### Signature Algorithm

This field is OPTIONAL.

The signature algorithm defines what algorithm to use for signature generation and verification.

If the algorithm suite includes a signature algorithm:

- Signatures MUST be generated using the specified signature algorithm.
- Signatures MUST be verified using the specified signature algorithm.

If the algorithm suite does not include a signature algorithm:

- Signatures MUST NOT be generated.
- Signatures MUST NOT be verified.

#### Supported Signature Algorithms

- [ECDSA with P256 and SHA256](./transitive-requirements.md#ecdsa)
- [ECDSA with P384 and SHA384](./transitive-requirements.md#ecdsa)

### Message Format Version

Indicates the serialization or message format version for the supported algorithm suite.
This value can be duplicated across [supported libraries](#supported-libraries).
This MUST be used to branch any serialization/deserialization logic in [supported libraries](#supported-libraries).

#### Supported Message Format Version

**ESDK**

- 1.0
- 2.0

**S3EC**

- 1.0

### Algorithm Suite Data

Algorithm suites may capture a variable-per-algorithm-suite length of data
relevant to that algorithm suite’s mode of operation.

#### Supported Algorithm Suite Data

- Algorithm Suite 05 78 MUST store the commit key in the suite data
- Algorithm Suite 04 78 MUST store the commit key in the suite data

### Algorithm Suite Data Length

Then length of the [algorithm suite data](#algorithm-suite-data).
The field MAY be length 0.
Its length and how the contents are used
are determined by the algorithm suite.
Where the contents are stored is determined by the message format.

#### Supported Algorithm Suite Data Lengths

- 32

## Security Considerations

### Which algorithm suite should I use?

You should use the default algorithm suite.

You should use an algorithm suite that supports key commitment.

You may use the non-default AES-GCM with key derivation and signing key algorithm suites
if key derivation input lengths of other sizes are required.

If the users who encrypt and the users who decrypt are equally trusted,
you may use AES-GCM with only key derivation algorithm suites.

You should not use AES-GCM with only key derivation algorithm suites
if the users who encrypt and the users who decrypt are not equally trusted.

You should not use AES-GCM without key Derivation or signing,
except for backwards compatibility.

You should not use AES-CBC unless you need to decrypt legacy ciphertexts encrypted using AES-CBC.

You should not use AES-CTR unless you need to perform partial decryption of a ciphertext object encrypted using AES-GCM in a client that does not support a safe mode of partial ciphertext decryption.
