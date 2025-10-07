[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Content Metadata

## Version

0.1

### Changelog

0.1 - initial

### Definitions

- MapKey/mapkey
  - To distinguish the keys of a map (as in, key - value pairs), the term MapKey/mapkey is used to denote such a key

## Overview

Metadata in the context of the S3 Encryption Client refers to the information stored along with a given object that is required to decrypt the object.
This specification details the various contents of the metadata as it relates to objects encrypted using the S3EC.
See [metadata-strategy](./metadata-strategy.md) for details on how the metadata is stored.

### Format Versions

This specification details content metadata Format Versions.
This version number is not necessarily identical to S3EC or AWS SDK versions.
For the rest of this specification, unless otherwise specified, the version number refers to the Format Version, not the S3EC or AWS SDK version.

#### V1

The V1 format is the original format used by the S3EC.
Metadata containing "x-amz-key" is considered to use the V1 format.

#### V2

The V2 format was added alongside the V2 release of the S3EC in all languages.
The V2 format is also used by the V3 release of the Java, Go, and .NET S3EC implementations.
The V2 format extends the V1 format.
Metadata containing "x-amz-key-v2" is considered to use the V2 format.

#### V3

The V3 format was added for the V3 release of S3EC for C++, PHP, and Ruby and the V4 release of S3EC for Java, .NET, and Go.
The V3 format uses a compressed mapkey scheme, and thus is entirely divergent from the V1/V2 formats.
Metadata containing "x-amz-c" is considered to use the V3 format.

### Content Metadata MapKeys

Metadata is stored as a string -> string map (see TODO for further specification of "string").
Metadata is responsible for storing data which is critical for decryption of the object.
The mapkeys contained in the metadata depends on the format version used.
The "x-amz-meta-" prefix is automatically added by the S3 server and MUST NOT be included in implementation code.
The "x-amz-" prefix denotes that the metadata is owned by an Amazon product and MUST be prepended to all S3EC metadata mapkeys.

When the object is encrypted using the V1 format:

- The mapkey "x-amz-unencrypted-content-length" SHOULD be present for V1 format objects.
- The mapkey "x-amz-key" MUST be present for V1 format objects.
- The mapkey "x-amz-matdesc" MUST be present for V1 format objects.
- The mapkey "x-amz-iv" MUST be present for V1 format objects.

When the object is encrypted using the V2 format:

- The mapkey "x-amz-key-v2" MUST be present for V2 format objects.
- The mapkey "x-amz-matdesc" MUST be present for V2 format objects.
- The mapkey "x-amz-iv" MUST be present for V2 format objects.
- The mapkey "x-amz-wrap-alg" MUST be present for V2 format objects.
- The mapkey "x-amz-cek-alg" MUST be present for V2 format objects.
- The mapkey "x-amz-tag-len" MUST be present for V2 format objects.

The V3 format introduces the use of compression to reduce the size of S3EC-specific metadata.
The V3 format uses the following mapkeys:

- The mapkey "x-amz-c" MUST be present for V3 format objects.
  - This mapkey ("x-amz-c") SHOULD be represented by a constant named "CONTENT_CIPHER_V3" or similar in the implementation code.
  - This mapkey is the V3 version of the "x-amz-cek-alg" mapkey.
- The mapkey "x-amz-3" MUST be present for V3 format objects.
  - This mapkey ("x-amz-3") SHOULD be represented by a constant named "ENCRYPTED_DATA_KEY_V3" or similar in the implementation code.
  - This mapkey is the V3 version of the "x-amz-key" and "x-amz-key-v2" mapkeys.
- The mapkey "x-amz-m" SHOULD be present for V3 format objects.
  - This mapkey ("x-amz-m") SHOULD be represented by a constant named "MAT_DESC_V3" or similar in the implementation code.
  - This mapkey is the V3 version of the "x-amz-matdesc" mapkey.
- The mapkey "x-amz-t" SHOULD be present for V3 format objects.
  - This mapkey ("x-amz-t") SHOULD be represented by a constant named "ENCRYPTION_CONTEXT_V3" or similar in the implementation code.
  - This mapkey is new for V3 and serves to distinguish KMS Encryption Context from Raw Keyring Material Description.
- The mapkey "x-amz-w" MUST be present for V3 format objects.
  - This mapkey ("x-amz-w") SHOULD be represented by a constant named "ENCRYPTED_DATA_KEY_ALGORITHM_V3" or similar in the implementation code.
  - This mapkey is the V3 version of "x-amz-wrap-alg" mapkey.
- The mapkey "x-amz-d" MUST be present for V3 format objects.
  - This mapkey ("x-amz-d") SHOULD be represented by a constant named "KEY_COMMITMENT_V3" or similar in the implementation code.
  - This mapkey is new for V3 and refers to the Key Commitment value used by committing algorithm suites.
- The mapkey "x-amz-i" MUST be present for V3 format objects.
  - This mapkey ("x-amz-i") SHOULD be represented by a constant named "MESSAGE_ID_V3" or similar in the implementation code.
  - This mapkey is new for V3 and refers to the Message ID value used by committing algorithm suites.

In general, the storage medium is independent from the format, with the exception of the V3 format.
In the V3 format, the mapkeys "x-amz-c", "x-amz-d", and "x-amz-i" MUST be stored exclusively in the Object Metadata.
See [metadata-strategy](./metadata-strategy.md) for more details.

#### Determining S3EC Object Status

Whether or not an object is determined to be a valid object encrypted by S3EC is done via the following logic:

V1:

- If the metadata contains "x-amz-iv" and "x-amz-key" then the object MUST be considered as an S3EC-encrypted object using the V1 format.

V2:

- If the metadata contains "x-amz-iv" and "x-amz-metadata-x-amz-key-v2" then the object MUST be considered as an S3EC-encrypted object using the V2 format.

V3:

- If the metadata contains "x-amz-3" and "x-amz-d" and "x-amz-i" then the object MUST be considered an S3EC-encrypted object using the V3 format.

This logic applies only to objects using ObjectMetadata to store cryptographic metadata.
If the object matches none of the V1/V2/V3 formats, the S3EC MUST attempt to get the instruction file.

If there are multiple mapkeys which are meant to be exclusive, such as "x-amz-key", "x-amz-key-v2", and "x-amz-3" then the S3EC SHOULD throw an exception.
In general, if there is any deviation from the above format, with the exception of additional unrelated mapkeys, then the S3EC SHOULD throw an exception.

### Content Metadata Values

#### V1/V2/V3 Shared

Despite using different strings, the following mapkey has the same valid values in V1/V2/V3:

_x-amz-key (V1) / x-amz-key-v2 (V2) / x-amz-3 (V3)_

The base64-encoded bytes of the encrypted data key.

#### V1/V2 Shared

The following mapkeys are used in both the V1 and V2 format.

_x-amz-matdesc_

A JSON string containing the Material Description OR Encryption Context used when encrypting the data key.
See TODO-link for more details on Material Description and Encryption Context.
This string MAY be encoded by the esoteric double-encoding scheme used by the S3 web server.
See TODO-link for more details on the S3 double-encoding scheme.
The default value is the an empty JSON map (`{}`).

_x-amz-iv_

The base64-encoded bytes used as the IV when encrypting the content.

#### V1 Only

_x-amz-unencrypted-content-length_

The length in bytes of the plaintext object.

#### V2/V3 Shared

Despite using different strings, some of the mapkeys in V2 have the same valid values in the equivalent V3 mapkey.

_x-amz-wrap-alg (V2) / x-amz-w (V3)_

The algorithm used to encrypt the data key.
The valid values are:

- AES/GCM
- AESWrap
- kms+context
- kms
- RSA/ECB/OAEPWithSHA-256AndMGF1Padding
- RSA-OAEP-SHA1

_x-amz-cek-alg (V2) / x-amz-c (V3)_

The algorithm used to encrypt the object.
The valid values are:

- AES/GCM/NoPadding
- AES/CBC/PKCS5Padding
- 115
  - This represents the integer value of the Algorithm Suite ID representing the `ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY` algorithm suite (0x0073).

#### V2 Only

_x-amz-tag-len_

The length of the auth tag in the object.
This mapkey/value is only included when the content algorithm is AES/GCM/NoPadding.
The valid values are:

- 128

#### V3 Only

_x-amz-m_

A JSON string representing the Material Description of the key material used to encrypt the data key.
This material description string MAY be encoded by the esoteric double-encoding scheme used by the S3 web server.
The Material Description MUST be used for wrapping algorithms `AES/GCM`, `RSA-OAEP-SHA1` or `02`, `22`.
If set the default Material Description value MUST be set to an empty map (`{}`).
See TODO-link for more details on the S3 double-encoding scheme.

_x-amz-t_

A JSON string representing the AWS KMS Encryption Context associated with the encrypted object.
This encryption context string MAY be encoded by the esoteric double-encoding scheme used by the S3 web server.
The Encryption Context value MUST be used for wrapping algorithm `kms+context` or `12`.
See TODO-link for more details on the S3 double-encoding scheme.

_x-amz-w_

The wrapping algorithm used to encrypt the data key.
The V3 format uses compression here such that each wrapping algorithm is represented by a two digit string.
The valid values and their mapping to pre-existing values are:

- 02
  - AES/GCM
  - The wrapping algorithm value "02" MUST be translated to AES/GCM upon retrieval, and vice versa on write.
- 12
  - kms+context
  - The wrapping algorithm value "12" MUST be translated to kms+context upon retrieval, and vice versa on write.
- 22
  - RSA-OAEP-SHA1
  - The wrapping algorithm value "22" MUST be translated to RSA-OAEP-SHA1 upon retrieval, and vice versa on write.

_x-amz-d_

The base64-encoded bytes representing the Key Commitment associated with the encrypted object.

_x-amz-i_

The base64-encoded bytes representing the Message ID associated with the encrypted object.

### Algorithm Suite and Message Format Version Compatibility

The S3EC supports encryption with various content encryption Algorithm Suites:

- ALG_AES_256_CBC_IV16_NO_KDF
- ALG_AES_256_GCM_IV12_TAG16_NO_KDF
- ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY

The mapping of Algorithm Suite to Message Format Versions follows:

Objects encrypted with ALG_AES_256_CBC_IV16_NO_KDF MAY use either the V1 or V2 message format version.
Objects encrypted with ALG_AES_256_GCM_IV12_TAG16_NO_KDF MUST use the V2 message format version only.
Objects encrypted with ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY MUST use the V3 message format version only.
