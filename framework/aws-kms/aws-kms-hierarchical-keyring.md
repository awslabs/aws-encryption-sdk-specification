[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS KMS Hierarchical Keyring

## Version

0.2.0

### Changelog

- 0.2.0
  - [Update Cache Entry Identifier Formulas to shared cache across multiple Hierarchical Keyrings](../../changes/2024-09-13_cache-across-hierarchy-keyrings/change.md)
  - New optional parameter `Partition ID` used to distinguish Cryptographic Material Providers (i.e: Hierarchical Keyrings) writing to a cache
- 0.1.0
  - Initital record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                                                                                                                                                                                      |
| -------- | -------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dafny    | 0.2.0                                  | 1.0.0                     | [AwsKmsHierarchicalKeyring.dfy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/src/Keyrings/AwsKms/AwsKmsHierarchicalKeyring.dfy)                                                          |
| Java     | 0.1.0                                  | 1.0.0                     | [CreateAwsKmsHierarchicalKeyringInput.java](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/java/src/main/smithy-generated/software/amazon/cryptography/materialproviders/model/CreateAwsKmsHierarchicalKeyringInput.java) |
| .NET     | 0.1.0                                  | 1.0.0                     | [CreateAwsKmsHierarchicalKeyringInput.cs](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/net/Generated/AwsCryptographicMaterialProviders/CreateAwsKmsHierarchicalKeyringInput.cs)                                         |

## Overview

The Hierarchical keyring interacts with Amazon DynamoDB (AWS DDB) and AWS Key Management Service (AWS KMS).
The Hierarchical keyring uses AWS KMS Keys to protect [Branch Keys](#definitions) to establish a key hierarchy
and it uses Amazon DynamoDB to persist these [Branch Keys](#definitions).
The Hierarchical keyring allows customers to reduce AWS KMS calls by locally caching branch keys in the established hierarchy and using them to protect data keys.

## Definitions

- [Branch Key(s)](../structures.md#branch-key): Data keys that are reused to derive unique data keys for envelope encryption.
  For security considerations on when to rotate the branch key, refer to [Appendix B](#appendix-b-security-considerations-for-branch-key-rotation).
- [Keystore](../branch-key-store.md): a resource responsible for managing and protecting branch keys in DDB.
- [UUID](https://www.ietf.org/rfc/rfc4122.txt): a universally unique identifier that can be represented as a byte sequence or a string.

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Interface

MUST implement the [AWS Encryption SDK Keyring interface](../keyring-interface.md#interface)

## Initialization

On initialization, the caller:

- MUST provide a [Keystore](../branch-key-store.md)
- MUST provide a [cache limit TTL](#cache-limit-ttl)
- MUST provide either a Branch Key Identifier or a [Branch Key Supplier](#branch-key-supplier)
- MAY provide a [Cache Type](#cache-type)
- MAY provide a [Partition ID](#partition-id)

If the Hierarchical Keyring does NOT get a `Shared` cache on initialization,
it MUST initialize a [cryptographic-materials-cache](../local-cryptographic-materials-cache.md)
with the user provided cache limit TTL and the entry capacity.
If no `cache` is provided, a `DefaultCache` MUST be configured with entry capacity of 1000.

### Cache Limit TTL

The maximum amount of time in seconds that an entry within the cache may be used before it MUST be evicted.
The client MUST set a time-to-live (TTL) for [branch key materials](../structures.md#branch-key-materials) in the underlying cache.
This value MUST be greater than zero.

### Cache Type

Sets the cache bound OR the type of cache scoped (created & bound) to the Hierarchical Keyring.
By providing an already initialized `Shared` cache, users can determine the scope of the cache.
That is, when it is garbage collected or if the cache is bound to other Cryptographic Material Providers.
If any other type in `CacheType` is provided, the Hierarchical Keyring
will initialize a cache of that type, to be used with only this Hierarchical Keyring.
If not set, a `DefaultCache` is initialized to be used with only this Hierarchical Keyring with entryCapacity = 1000.

### Partition ID

A string that is used to avoid collisions with other Hierarchical Keyrings.
If this parameter is not set, the Hierarchical Keyring MUST set a partition ID
that uniquely identifies the respective Hierarchical Keyring.

The Partition ID MUST NOT be changed after initialization.

Please see [Shared Cache Considerations](#shared-cache-considerations) on how to provide the
Partition ID and Logical Key Store Name while providing a Shared Cache to the Hierarchical Keyring.

## Structure

### Ciphertext

This structure is a sequence of bytes in big-endian format to be used as
the [ciphertext](structures.md#ciphertext) field in
[encrypted data keys](structures.md#encrypted-data-key) produced by the AWS KMS Hierarchical Keyring.

This structure is formed using the 16 byte `salt` used to derive the `derivedBranchKey`
concatenated with the AES-GCM-256 12 byte `IV`
concatenated with the byte representation of the UUID branch key version from the [branch key materials](../structures.md#branch-key-materials)
concatenated with the AES Encryption output from the [branch key wrapping](#branch-key-wrapping).

The branch key version is a UUID. Converting the 36 characters UUID string into bytes yields 16 bytes.
For details see [Branch Key and Beacon Key Creation](../branch-key-store.md#branch-key-and-beacon-key-creation).

The following table describes the fields that form the ciphertext for this keyring.
The bytes are appended in the order shown.
The Encryption Key is variable.
It will be whatever length is represented by the algorithm suite.
Because all the other values are constant,
this variability in the encryption key does not impact the format.

| Field              | Length (bytes) | Interpreted as |
| ------------------ | -------------- | -------------- |
| Salt               | 16             | bytes          |
| IV                 | 12             | bytes          |
| Version            | 16             | bytes          |
| Encrypted Key      | Variable       | bytes          |
| Authentication Tag | 16             | bytes          |

#### Authentication Tag

The authentication tag returned by the AES-GCM encryption.

## Operation

### OnEncrypt

OnEncrypt MUST take [encryption materials](../structures.md#encryption-materials) as input.

The `branchKeyId` used in this operation is either the configured branchKeyId, if supplied, or the result of the `branchKeySupplier`'s
`getBranchKeyId` operation, using the encryption material's encryption context as input.

If the input [encryption materials](../structures.md#encryption-materials) do not contain a plaintext data key,
OnEncrypt MUST generate a random plaintext data key, according to the key length defined in the [algorithm suite](../algorithm-suites.md#encryption-key-length).
The process used to generate this random plaintext data key MUST use a secure source of randomness.

The hierarchical keyring MUST attempt to find [branch key materials](../structures.md#branch-key-materials)
from the underlying [cryptographic materials cache](../local-cryptographic-materials-cache.md).
The hierarchical keyring MUST use the formulas specified in [Appendix A](#appendix-a-cache-entry-identifier-formulas)
to compute the [cache entry identifier](../cryptographic-materials-cache.md#cache-identifier).

If a cache entry is found and the entry's TTL has not expired, the hierarchical keyring MUST use those branch key materials for key wrapping.

If using a `Shared` cache across multiple Hierarchical Keyrings, different keyrings having the same `branchKey` can have different TTLs.
In such a case, the expiry time in the cache is set according to the Keyring that populated the cache.
There MUST be a check to make sure that for the cache entry found, who's TTL has NOT expired,
`time.now() - cacheEntryCreationTime <= ttlSeconds` is true and valid for TTL of the Hierarchical Keyring getting the cache entry.
If this is NOT true, then we MUST treat the cache entry as expired.

If a cache entry is not found or the cache entry is expired, the hierarchical keyring MUST attempt to obtain the branch key materials
by querying the backing branch keystore specified in the [retrieve OnEncrypt branch key materials](#query-branch-keystore-onencrypt) section.

If the keyring is not able to retrieve [branch key materials](../structures.md#branch-key-materials)
through the underlying cryptographic materials cache or
it no longer has access to them through the backing keystore, OnEncrypt MUST fail.

Otherwise, OnEncrypt:

- MUST wrap a data key with the branch key materials according to the [branch key wrapping](#branch-key-wrapping) section.

If the keyring is unable to wrap a plaintext data key, OnEncrypt MUST fail
and MUST NOT modify the [decryption materials](structures.md#decryption-materials).

Otherwise, OnEncrypt MUST append a new [encrypted data key](../structures.md#encrypted-data-key)
to the encrypted data key list in the [encryption materials](../structures.md#encryption-materials), constructed as follows:

- [ciphertext](../structures.md#ciphertext): MUST be serialized as the [hierarchical keyring ciphertext](#ciphertext)
- [key provider id](../structures.md#key-provider-id): MUST be UTF8 Encoded "aws-kms-hierarchy"
- [key provider info](../structures.md#key-provider-information): MUST be the UTF8 Encoded AWS DDB response `branch-key-id`

#### Query Branch Keystore OnEncrypt

The branch keystore persists [branch keys](#definitions) that are reused to derive unique data keys for envelope encryption to
reduce the number of calls to AWS KMS through the use of the
[cryptographic materials cache](../cryptographic-materials-cache.md).

OnEncrypt MUST call the Keystore's [GetActiveBranchKey](../branch-key-store.md#getactivebranchkey) operation with the following inputs:

- the `branchKeyId` used in this operation

If the Keystore's GetActiveBranchKey operation succeeds
the keyring MUST put the returned branch key materials in the cache using the
formula defined in [Appendix A](#appendix-a-cache-entry-identifier-formulas).

Otherwise, OnEncrypt MUST fail.

#### Branch Key Wrapping

To derive and encrypt a data key the keyring will follow the same key derivation and encryption as [AWS KMS](https://rwc.iacr.org/2018/Slides/Gueron.pdf).

The hierarchical keyring MUST:

1. Generate a 16 byte random `salt` using a secure source of randomness
1. Generate a 12 byte random `IV` using a secure source of randomness
1. Use a [KDF in Counter Mode with a Pseudo Random Function with HMAC SHA 256](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1.pdf) to derive a 32 byte `derivedBranchKey` data key with the following inputs:
   - Use the `salt` as the salt.
   - Use the branch key as the `key`.
   - Use the UTF8 Encoded value "aws-kms-hierarchy" as the label.
1. Encrypt a plaintext data key with the `derivedBranchKey` using `AES-GCM-256` with the following inputs:
   - MUST use the `derivedBranchKey` as the AES-GCM cipher key.
   - MUST use the plain text data key that will be wrapped by the `derivedBranchKey` as the AES-GCM message.
   - MUST use the derived `IV` as the AES-GCM IV.
   - MUST use an authentication tag byte of length 16.
   - MUST use the serialized [AAD](#branch-key-wrapping-and-unwrapping-aad) as the AES-GCM AAD.

If OnEncrypt fails to do any of the above, OnEncrypt MUST fail.

### OnDecrypt

OnDecrypt MUST take [decryption materials](../structures.md#decryption-materials) and a list of [encrypted data keys](../structures.md#encrypted-data-keys) as input.

The `branchKeyId` used in this operation is either the configured branchKeyId, if supplied, or the result of the `branchKeySupplier`'s
`getBranchKeyId` operation, using the decryption material's encryption context as input.

If the decryption materials already contain a `PlainTextDataKey`, OnDecrypt MUST fail.

The set of encrypted data keys MUST first be filtered to match this keyring’s configuration. For the encrypted data key to match:

- Its provider ID MUST match the UTF8 Encoded value of “aws-kms-hierarchy”.
- Deserialize the key provider info, if deserialization fails the next EDK in the set MUST be attempted.
  - The deserialized key provider info MUST be UTF8 Decoded and MUST match this keyring's configured `Branch Key Identifier`.

For each encrypted data key in the filtered set, one at a time, OnDecrypt MUST attempt to decrypt the encrypted data key.
If this attempt results in an error, then these errors MUST be collected.

To decrypt each encrypted data key in the filtered set, the hierarchical keyring MUST attempt
to find the corresponding [branch key materials](../structures.md#branch-key-materials)
from the underlying [cryptographic materials cache](../local-cryptographic-materials-cache.md).
The hierarchical keyring MUST use the OnDecrypt formula specified in [Appendix A](#decryption-materials)
in order to compute the [cache entry identifier](cryptographic-materials-cache.md#cache-identifier).

If a cache entry is found and the entry's TTL has not expired, the hierarchical keyring MUST use those branch key materials for key unwrapping.

If using a `Shared` cache across multiple Hierarchical Keyrings, different keyrings having the same `branchKey` can have different TTLs.
In such a case, the expiry time in the cache is set according to the Keyring that populated the cache.
There MUST be a check to make sure that for the cache entry found, who's TTL has NOT expired,
`time.now() - cacheEntryCreationTime <= ttlSeconds` is true and valid for TTL of the Hierarchical Keyring getting the cache entry.
If this is NOT true, then we MUST treat the cache entry as expired.

If a cache entry is not found or the cache entry is expired, the hierarchical keyring
MUST attempt to obtain the branch key materials by calling the backing branch key
store specified in the [retrieve OnDecrypt branch key materials](#getitem-branch-keystore-ondecrypt) section.

If the keyring is not able to retrieve `branch key materials` from the backing keystore then OnDecrypt MUST fail.

If the keyring is able to retrieve `branch key materials` from the backing keystore, OnDecrypt:

- MUST unwrap the encrypted data key with the branch key materials according to the [branch key unwrapping](#branch-key-unwrapping) section.

If a decryption succeeds, this keyring MUST
add the resulting plaintext data key to the decryption materials and return the modified materials.

If OnDecrypt fails to successfully decrypt any [encrypted data key](../structures.md#encrypted-data-key),
then it MUST yield an error that includes all the collected errors
and MUST NOT modify the [decryption materials](structures.md#decryption-materials).

#### GetItem Branch Keystore OnDecrypt

The branch keystore persists [branch keys](#definitions) that are reused to derive unique data keys for key wrapping to
reduce the number of calls to AWS KMS through the use of the
[cryptographic materials cache](../cryptographic-materials-cache.md).

OnDecrypt MUST calculate the following values:

- Deserialize the UTF8-Decoded `branch-key-id` from the [key provider info](../structures.md#key-provider-information) of the [encrypted data key](../structures.md#encrypted-data-key)
  and verify this is equal to the configured or supplied `branch-key-id`.
- Deserialize the UUID string representation of the `version` from the [encrypted data key](../structures.md#encrypted-data-key) [ciphertext](#ciphertext).

OnDecrypt MUST call the Keystore's [GetBranchKeyVersion](../branch-key-store.md#getbranchkeyversion) operation with the following inputs:

- The deserialized, UTF8-Decoded `branch-key-id`
- The deserialized UUID string representation of the `version`

If the Keystore's GetBranchKeyVersion operation succeeds
the keyring MUST put the returned branch key materials in the cache using the
formula defined in [Appendix A](#appendix-a-cache-entry-identifier-formulas).

Otherwise, OnDecrypt MUST fail.

#### Branch Key Unwrapping

To decrypt an encrypted data key with a branch key, the hierarchical keyring MUST:

1. Deserialize the 16 byte random `salt` from the [edk ciphertext](../structures.md#ciphertext).
1. Deserialize the 12 byte random `IV` from the [edk ciphertext](../structures.md#ciphertext).
1. Deserialize the 16 byte `version` from the [edk ciphertext](../structures.md#ciphertext).
1. Deserialize the `encrypted key` from the [edk ciphertext](../structures.md#ciphertext).
1. Deserialize the `authentication tag` from the [edk ciphertext](../structures.md#ciphertext).

1. Use a [KDF in Counter Mode with a Pseudo Random Function with HMAC SHA 256](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1.pdf) to derive
   the 32 byte `derivedBranchKey` data key with the following inputs:
   - Use the `salt` as the salt.
   - Use the branch key as the `key`.
1. Decrypt the encrypted data key with the `derivedBranchKey` using `AES-GCM-256` with the following inputs:
   - It MUST use the `encrypted key` obtained from deserialization as the AES-GCM input ciphertext.
   - It MUST use the `authentication tag` obtained from deserialization as the AES-GCM input authentication tag.
   - It MUST use the `derivedBranchKey` as the AES-GCM cipher key.
   - It MUST use the `IV` obtained from deserialization as the AES-GCM input IV.
   - It MUST use the serialized [encryption context](#branch-key-wrapping-and-unwrapping-aad) as the AES-GCM AAD.

If OnDecrypt fails to do any of the above, OnDecrypt MUST fail.

### Branch Key Wrapping and Unwrapping AAD

To Encrypt and Decrypt the `wrappedDerivedBranchKey` the keyring MUST include the following values as part of the AAD for
the AES Encrypt/Decrypt calls.

To construct the AAD, the keyring MUST concatenate the following values

1. "aws-kms-hierarchy" as UTF8 Bytes
1. Value of `branch-key-id` as UTF8 Bytes
1. [version](../structures.md#branch-key-version) as Bytes
1. [encryption context](structures.md#encryption-context-1) from the input
   [encryption materials](../structures.md#encryption-materials) according to the [encryption context serialization specification](../structures.md#serialization).

| Field               | Length (bytes) | Interpreted as                                       |
| ------------------- | -------------- | ---------------------------------------------------- |
| "aws-kms-hierarchy" | 17             | UTF-8 Encoded                                        |
| branch-key-id       | Variable       | UTF-8 Encoded                                        |
| version             | 16             | Bytes                                                |
| encryption context  | Variable       | [Encryption Context](../structures.md#serialization) |

If the keyring cannot serialize the encryption context, the operation MUST fail.

## Appendix A: Cache Entry Identifier Formulas

When accessing the underlying cryptographic materials cache,
the hierarchical keyring MUST use the formulas specified in this appendix
in order to compute the [cache entry identifier](../cryptographic-materials-cache.md#cache-identifier).

### Preliminaries

Each of the cache entry identifier formulas includes serialized information related to the branch key,
as defined in the [Key Provider Info](../structures.md#key-provider-information).

We establish the following definitions for the Cache Entry Identifier formula:

#### Resource Identifier

A Hex value that indicates if an element is from a Caching_CMM, Hierarchical_Keyring, or some other future resource.

```
Caching_CMM : 0x01  (0001)
Hierarchical_Keyring : 0x02 (0010)
```

#### Scope Identifier

A Hex value that indicates if an element is used for Encryption, Decryption, Searchable Encryption, or some other future purpose.

```
Encrypt : 0x01 (0001)
Decrypt : 0x02 (0010)
Searchable Encryption : 0x03 (0011)
```

#### Partition ID

Partition ID is an optional parameter provided to the Hierarchical Keyring input, which distinguishes
Cryptographic Material Providers (i.e: Hierarchical Keyrings) writing to a cache.
It can either be a String provided by the user, which MUST be interpreted as the bytes of
UTF-8 Encoding of the String, or a v4 UUID, which SHOULD be interpreted as the 16 byte representation of the UUID.

Note: The cache will not know if the Partition ID is a String set by the user or the UUID.
The constructor of the Hierarchy Keyring MUST record these bytes at construction time.

Please see [Shared Cache Considerations](#shared-cache-considerations) on how to provide the
Partition ID and Logical Key Store Name while providing a Shared Cache to the Hierarchical Keyring.

#### Resource Suffix

There are, at this time, 2 resource suffixes for the Hierarchical Keyring:

- Hierarchical Keyring: Encryption Materials:
  ```
  logicalKeyStoreName + NULL_BYTE + UTF8Encode(branchKeyId)
  ```
- Hierarchical Keyring: Decryption Materials:
  ```
  logicalKeyStoreName + NULL_BYTE + UTF8Encode(branchKeyId) + NULL_BYTE + UTF8Encode(branchKeyVersion)
  ```

The aforementioned 4 definitions ([Resource Identifier](#resource-identifier),
[Scope Identifier](#scope-identifier), [Partition ID](#partition-id-1), and
[Resource Suffix](#resource-suffix)) MUST be appended together with the null byte, 0x00,
and the SHA384 of the result should be taken as the final cache identifier.

### Encryption Materials

When the hierarchical keyring receives an OnEncrypt request,
the cache entry identifier MUST be calculated as the
SHA-384 hash of the following byte strings, in the order listed:

- MUST be the Resource ID for the Hierarchical Keyring (0x02)
- MUST be the Scope ID for Encrypt (0x01)
- MUST be the Partition ID for the Hierarchical Keyring
- Resource Suffix
  - MUST be the UTF8 encoded Logical Key Store Name of the keystore for the Hierarchical Keyring
  - MUST be the UTF8 encoded branch-key-id

All the above fields must be separated by a single NULL_BYTE `0x00`.

| Field                  | Length (bytes) | Interpreted as      |
| ---------------------- | -------------- | ------------------- |
| Resource ID            | 1              | bytes               |
| Null Byte              | 1              | `0x00`              |
| Scope ID               | 1              | bytes               |
| Null Byte              | 1              | `0x00`              |
| Partition ID           | Variable       | bytes               |
| Null Byte              | 1              | `0x00`              |
| Logical Key Store Name | Variable       | UTF-8 Encoded Bytes |
| Null Byte              | 1              | `0x00`              |
| Branch Key ID          | Variable       | UTF-8 Encoded Bytes |

As a formula:

```
resource-id = [0x02]
scope-id = [0x01]
logical-key-store-name = UTF8Encode(keystore.LogicalKeyStoreName)
branch-key-id = UTF8Encode(hierarchicalKeyring.BranchKeyIdentifier)
NULL_BYTE = [0x00]

ENTRY_ID = SHA384(
    resource-id
    + NULL_BYTE
    + scope-id
    + NULL_BYTE
    + partition-id
    + NULL_BYTE
    + logical-key-store-name
    + NULL_BYTE
    + branch-key-id
)
```

### Decryption Materials

When the hierarchical keyring receives an OnDecrypt request,
it MUST calculate the cache entry identifier as the SHA-384 hash of the following byte strings, in the order listed:

- MUST be the Resource ID for the Hierarchical Keyring (0x02)
- MUST be the Scope ID for Decrypt (0x02)
- MUST be the Partition ID for the Hierarchical Keyring
- Resource Suffix
  - MUST be the UTF8 encoded Logical Key Store Name of the keystore for the Hierarchical Keyring
  - MUST be the UTF8 encoded branch-key-id
  - MUST be the UTF8 encoded branch-key-version

All the above fields must be separated by a single NULL_BYTE `0x00`.

| Field                  | Length (bytes) | Interpreted as      |
| ---------------------- | -------------- | ------------------- |
| Resource ID            | 1              | bytes               |
| Null Byte              | 1              | `0x00`              |
| Scope ID               | 1              | bytes               |
| Null Byte              | 1              | `0x00`              |
| Partition ID           | Variable       | bytes               |
| Null Byte              | 1              | `0x00`              |
| Logical Key Store Name | Variable       | UTF-8 Encoded Bytes |
| Null Byte              | 1              | `0x00`              |
| Branch Key ID          | Variable       | UTF-8 Encoded Bytes |
| Null Byte              | 1              | `0x00`              |
| branch-key-version     | 36             | UTF-8 Encoded Bytes |

As a formula:

```
resource-id = [0x02]
scope-id = [0x02]
logical-key-store-name = UTF8Encode(keystore.LogicalKeyStoreName)
branch-key-id = UTF8Encode(hierarchicalKeyring.BranchKeyIdentifier)
branch-key-version = UTF8Encode(branchKeyVersion)
NULL_BYTE = [0x00]

ENTRY_ID = SHA384(
    resource-id
    + NULL_BYTE
    + scope-id
    + NULL_BYTE
    + partition-id
    + NULL_BYTE
    + logical-key-store-name
    + NULL_BYTE
    + branch-key-id
    + NULL_BYTE
    + branch-key-version
)
```

## Shared Cache Considerations

If you have two or more Hierarchy Keyrings with:

- Same Partition ID
- Same Logical Key Store Name of the Key Store for the Hierarchical Keyring
- Same Branch Key ID
  then they WILL share the cache entries in the Shared Cache.
  Please make sure that you set all of Partition ID, Logical Key Store Name and Branch Key ID
  to be the same for two Hierarchical Keyrings only if you want them to share cache entries.

Therefore, there are two important parameters that users need to carefully set while providing the shared cache:

### Partition ID

Partition ID is an optional parameter provided to the Hierarchical Keyring input,
which distinguishes Cryptographic Material Providers (i.e: Hierarchical Keyrings) writing to a cache.

- (Default) If the Partition ID is not set by the user, it is initialized as a random 16-byte UUID, which makes
  it unique for every Hierarchical Keyring. In this case, two Hierarchical Keyrings (or another Material Provider)
  CANNOT share the same cache entries in the cache.
- If the Partition ID is set by the user and is the same for two Hierarchical Keyrings (or another Material Provider),
  they CAN share the same cache entries in the cache.
- If the Partition ID is set by the user and is different for two Hierarchical Keyrings (or another Material Provider),
  they CANNOT share the same cache entries in the cache.

### Logical Key Store Name

> Note: You MUST NEVER have two different physical Key Stores with the same Logical Key Store Name.

This parameter is set by the user when configuring the Key Store for
the Hierarchical Keyring. This is a logical name for the branch key store.

Suppose you have a physical Key Store on DynamoDB (K). You create two Key Store clients of K (K1 and K2).
Now, you create two Hierarchical Keyrings (HK1 and HK2) with these Key Store clients (K1 and K2 respectively).

- If you want to share cache entries across these two keyrings HK1 and HK2, you should set the Logical Key Store Names
  for both the Key Store clients (K1 and K2) to be the same.
- If you set the Logical Key Store Names for K1 and K2 to be different, HK1 (which uses Key Store client K1)
  and HK2 (which uses Key Store client K2) will NOT be able to share cache entries.

Notice that both K1 and K2 are clients for the same physical Key Store (K).

## Branch Key Supplier

The Branch Key Supplier is an interface containing the `GetBranchKeyId` operation.
This operation MUST take in an encryption context as input,
and return a branch key id (string) as output.

This supplier may be implemented by customers in order to configure behavior where the hierarchical
keyring may decide on which branch key to use based on information in the encryption context.
This gives customers more flexibility in multi-tenant use cases.

## Appendix B: Security Considerations for Branch Key Rotation

Branch Keys are not used to wrap plaintext data keys; instead they are used to derive unique `derivedBranchKeys`.
The `derivedBranchKeys` are responsible for wrapping plaintext data keys set on the [encryption materials](../structures.md#encryption-materials).

Branch Keys have a limit on how many times they are able to derive a `derivedBranchKey` before a theoretical collision.

To derive a `derivedBranchKey` the Keyring uses a 16 byte salt for the KDF.
Additionally the keyring uses a 12-byte IV for the AES-GCM-256 for key wrapping.
We have selected to use these `salt` and `IV` parameters as they are the same parameters used
in [AWS KMS key derivation](https://rwc.iacr.org/2018/Slides/Gueron.pdf).

Overall this results in 28 bytes (224 bits) of randomness. By the birthday bound, there is a 2^{-32} chance of a key/IV collision after

```
2^{ (224 - 32) / 2 }

= 2^96

= 7.9228163e+28

= 79,228,162,514,264,337,593,543,950,336
```

derivations. In other words, you could derive 2^96 `derivedBranchKeys` before incurring a cryptographically relevant chance of reusing a AES-GCM key/IV pair.
Given the magnitude of the result; it is recommended to rotate the `branchKey` once per year as this is also the cadence
at which AWS KMS rotates its [AWS Managed Keys](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html#rotate-keys-how-it-works).
Using this combination of IV and salt for the KDF and Wrapping operations significantly extends the lifetime of the key; this allows
customers to define their rotation schedule by criteria other than cryptographic safety limits.

### Other considerations

We considered deriving a `derivedBranchKey` with the following construction.

Use a 32-byte salt for an HKDF operation using the `branchKey` as the input key material.
Use no IV for AES GCM 256 Key Wrapping

This would result in a total of 256 bits of randomness

32 = 256 bits of randomness

Birthday Problem calculations:

```
(256 - 32) / 2 = 112

2^112 = 5,192,296,858,534,827,628,530,496,329,220,096
```

The above number is how many times one would have to wrap with the `derivedBranchKey` before incurring a cryptographically relevant probability of a collision.
Although this is a higher number we decided on the current selection of including a salt and an IV to not only
lower the overhead of bytes we have to store in the [edk ciphertext](../structures.md#ciphertext) but to
easily reason about the security properties of the key derivation since it is what AWS KMS does.
