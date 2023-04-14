[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS KMS Hierarchical Keyring

## Version

0.1.0

### Changelog

- 0.1.0
  - Initital record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

## Overview

The Hierarchical keyring interacts with Amazon DynamoDB (AWS DDB) and AWS Key Management Service (AWS KMS).
The Hierarchical keyring uses AWS KMS Keys to protect [Branch Keys](#definitions) to establish a key hierarchy
and it uses Amazon DynamoDB to persist these [Branch Keys](#definitions).
The Hierarchical keyring allows customers to reduce AWS KMS calls by locally caching branch keys in the established hierarchy and using them to protect data keys.

## Definitions

- [Branch Key(s)](../structures.md#branch-key): Data keys that are reused to derive unique data keys for envelope encryption.
  For security considerations on when to rotate the branch key, refer to [Appendix B](#appendix-b-security-considerations-for-branch-key-rotation).
- [UUID](https://www.ietf.org/rfc/rfc4122.txt): a universally unique identifier that can be represented as a byte sequence or a string.

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Interface

MUST implement the [AWS Encryption SDK Keyring interface](../keyring-interface.md#interface)

## Initialization

On initialization, the caller:

- MUST provide an AWS KMS key identifier
- MUST provide an AWS KMS SDK client
- MUST provide an AWS DDB SDK client
- MUST provide an [AWS DDB Table ARN](https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondynamodb.html#amazondynamodb-table)
- MUST provide a [cache limit TTL](#cache-limit-ttl)
- MUST provide a Branch Key Identifier
- MAY provide a max cache size
- MAY provide a list of Grant Tokens

The AWS KMS key identifier MUST be [a valid identifier](aws-kms-key-arn.md#a-valid-aws-kms-identifier).

On initialization the Hiearchical MUST append a user agent string to the AWS KMS SDK Client with the
value `aws-kms-hierarchical-keyring`.

On initialization the Hierarchical Keyring MUST initialize a [cryptographic-materials-cache](../local-cryptographic-materials-cache.md) with the configured cache limit TTL and the max cache size.
If no max cache size is provided, the crypotgraphic materials cache MUST be configured to a
max cache size of 1000.

### Cache Limit TTL

The maximum amount of time in seconds that an entry within the cache may be used before it MUST be evicted.
The client MUST set a time-to-live (TTL) for [hierarchical materials](../structures.md#hierarchical-materials) in the underlying cache.
This value MUST be greater than zero.

## Structure

### Ciphertext

This structure is a sequence of bytes in big-endian format to be used as
the [ciphertext](structures.md#ciphertext) field in
[encrypted data keys](structures.md#encrypted-data-key) produced by the AWS KMS Hierarchical Keyring.

This structure is formed using the 16 byte `salt` used to derive the `derivedBranchKey`
concatenated with the AES-GCM-256 12 byte `IV`
concatenated with the byte representation of the UUID branch key version from the AWS DDB response `version` value
concatenated with the AES Encryption output from the [branch key wrapping](#branch-key-wrapping).

The following table describes the fields that form the ciphertext for this keyring.
The bytes are appended in the order shown.

| Field              | Length (bytes) | Interpreted as |
| ------------------ | -------------- | -------------- |
| Salt               | 16             | bytes          |
| IV                 | 12             | bytes          |
| Version            | 16             | bytes          |
| Encrypted Key      | 32             | bytes          |
| Authentication Tag | 16             | bytes          |

#### Authentication Tag

The authentication tag returned by the AES-GCM encryption.

## Operation

### OnEncrypt

OnEncrypt MUST take [encryption materials](../structures.md#encryption-materials) as input.

If the input [encryption materials](../structures.md#encryption-materials) do not contain a plaintext data key,
OnEncrypt MUST generate a random plaintext data key, according to the key length defined in the [algorithm suite](../algorithm-suites.md#encryption-key-length).
The process used to generate this random plaintext data key MUST use a secure source of randomness.

The hierarchical keyring MUST attempt to find [hierarchical materials](../structures.md#hierarchical-materials)
from the underlying [cryptographic materials cache](../local-cryptographic-materials-cache.md).
The hierarchical keyring MUST use the formulas specified in [Appendix A](#appendix-a-cache-entry-identifier-formulas)
to compute the [cache entry identifier](../cryptographic-materials-cache.md#cache-identifier).

If a cache entry is found and the entry's TTL has not expired, the hierarchical keyring MUST use those hierarchical materials for key wrapping.

If a cache entry is not found or the cache entry is expired, the hierarchical keyring MUST attempt to obtain the hierarchical materials
by querying the backing branch keystore specified in the [retrive OnEncrypt hierarchical materials](#query-branch-keystore-onencrypt) section.

If the keyring is not able to retrieve materials through the underyling cryptographic materials cache or
it no longer has access to them through the backing keystore, OnEncrypt MUST fail.

Otherwise, OnEncrypt:

- MUST wrap a data key with the hierarchical materials according to the [branch key wrapping](#branch-key-wrapping) section.

If the keyring is unable to wrap a plaintext data key, OnEncrypt MUST fail
and MUST NOT modify the [decryption materials](structures.md#decryption-materials).

Otherwise, OnEncrypt MUST append a new [encrypted data key](../structures.md#encrypted-data-key)
to the encrypted data key list in the [encryption materials](../structures.md#encryption-materials), constructed as follows:

- [ciphertext](../structures.md#ciphertext): MUST be serialized as the [hierarchical keyring ciphertext](#ciphertext)
- [key provider id](../structures.md#key-provider-id): MUST be UTF8 Encoded "aws-kms-hierarchy"
- [key provider info](../structures.md#key-provider-information): MUST be the UTF8 Encoded AWS DDB response `branch-key-id`

#### Query Branch KeyStore OnEncrypt

The branch keystore persists [branch keys](#definitions) that are reused to derive unique data keys for envelope encryption to
reduce the number of calls to AWS KMS through the use of the
[cryptographic materials cache](../cryptographic-materials-cache.md).

During OnEncrypt, the branch keystore is indexed by the `STATUS` of the keys.
To query this keystore, the caller MUST do the following:

1. Use the global secondary index (GSI) `Active-Keys` to query the keystore to retrieve the active key that matches the `branch-key-id` configured on the keyring.
   1. If the client is unable to fetch an `ACTIVE` key, OnEncrypt MUST fail.
   1. Performing a query on the [branch keystore](../branch-key-store.md#record-format) may return multiple entries.
      There SHOULD only be one `ACTIVE` key. In the case where more than one key is labeled `ACTIVE`,
      the keyring MUST resolve which key to use using the `create-time` field, the latest time value should be used as the `ACTIVE` key.
      - If the `create-time` values between two active keys are the same, the keyring MUST order by the `version` lexicographically, and resolve to
        the "highest" version

In Java this query would look like:

```
Map<String, AttributeValue> keyEntry = ddbClient.query(
   QueryRequest.builder()
             .tableName(tableName)
             .indexName(gsi)
             .keyConditionExpression("#status = :status and #branch-key-id = :branch-key-id")
             .expressionAttributeNames(expressionAttributesNames)
             .expressionAttributeValues(expressionAttributeValues)
             .build();
 )
 .items();
```

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](../branch-key-store.md#record-format).
If the record does not contain the defined fields, OnEncrypt MUST fail.

The keyring MUST decrypt the branch key according to the [AWS KMS Branch Key Decryption](#aws-kms-branch-key-decryption) section.

If the branch key fails to decrypt, OnEncrypt MUST fail.

If the decryption of the branch key succeeds, OnEncrypt verifies:

- The `KeyId` field in the AWS KMS response MUST equal the configured AWS KMS key identifier.

If decryption and verification of the branch key succeeds:

- The keyring MUST construct Hierarchical Materials using the `Plaintext` value from the KMS response and
  the [`version`](../branch-key-store.md#record-format) value in its string representation from the AWS DDB branch key record response.
- The keyring MUST put the constructed Hierarchical Materials in the cache using the
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

If the decryption materials already contain a `PlainTextDataKey`, OnDecrypt MUST fail.

The set of encrypted data keys MUST first be filtered to match this keyring’s configuration. For the encrypted data key to match:

- Its provider ID MUST match the UTF8 Encoded value of “aws-kms-hierarchy”.
- Deserialize the key provider info, if deserialization fails the next EDK in the set MUST be attempted.
  -- The deserialized key provider info MUST be UTF8 Decoded and MUST match this keyring's configured `Branch Key Identifier`.

For each encrypted data key in the filtered set, one at a time, OnDecrypt MUST attempt to decrypt the encrypted data key.
If this attempt results in an error, then these errors MUST be collected.

To decrypt each encrypted data key in the filtered set, the hierarchical keyring MUST attempt
to find the corresponding [hierarchical materials](../structures.md#hierarchical-materials)
from the underlying [cryptographic materials cache](../local-cryptographic-materials-cache.md).
The hierarchical keyring MUST use the OnDecrypt formula specified in [Appendix A](#decryption-materials)
in order to compute the [cache entry identifier](cryptographic-materials-cache.md#cache-identifier).

If a cache entry is found and the entry's TTL has not expired, the hierarchical keyring MUST use those hierarchical materials for key unwrapping.

If a cache entry is not found or the cache entry is expired, the hierarchical keyring
MUST attempt to obtain the hierarchical materials by calling the backing branch key
store specified in the [retrieve OnDecrypt hierarchical materials](#getitem-branch-keystore-ondecrypt) section.

If the keyring is not able to retrieve `hierarchical materials` from the backing keystore then OnDecrypt MUST fail.

If the keyring is able to retrieve `hierarchical materials` from the backing keystore, OnDecrypt:

- MUST unwrap the encrypted data key with the hierarchical materials according to the [branch key unwrapping](#branch-key-unwrapping) section.

If a decryption succeeds, this keyring MUST
add the resulting plaintext data key to the decryption materials and return the modified materials.

If OnDecrypt fails to successfully decrypt any [encrypted data key](../structures.md#encrypted-data-key),
then it MUST yield an error that includes all the collected errors
and MUST NOT modify the [decryption materials](structures.md#decryption-materials).

#### GetItem Branch KeyStore OnDecrypt

The branch keystore persists [branch keys](#definitions) that are reused to derive unique data keys for key wrapping to
reduce the number of calls to AWS KMS through the use of the
[cryptographic materials cache](../cryptographic-materials-cache.md).

During OnDecrypt, the branch keystore is indexed by the `branch-key-id` and `version` values.
To get a branch key from the keystore the caller MUST do the following:

1. Deserialize the UTF8-Decoded `branch-key-id` from the [key provider info](../structures.md#key-provider-information) of the [encrypted data key](../structures.md#encrypted-data-key).
1. Deserialize the UUID string representation of the `version` from the [encrypted data key](../structures.md#encrypted-data-key) [ciphertext](#ciphertext).
1. Call AWS DDB `GetItem` using the `branch-key-id` as the Partition Key and the `version` value as the Sort Key.
   1. If the client is not able to retrieve hierarchical materials, then OnDecrypt MUST fail.

In Java this `GetItem` call would look like:

```
Map<String, AttributeValue> desiredKey= new HashMap<>();
desiredKey.put("branch-key-id", AttributeValue.builder().s(<some value>).build());
desiredKey.put("version", AttributeValue.builder().s(<some uuid>).build());

GetItemResponse response = ddbClient.getItem(
   GetItemRequest.builder()
      .tableName(tableName)
      .key(desiredKey)
      .build()
);
```

The AWS DDB response MUST contain the fields defined in the [branch keystore record format](../branch-key-store.md#record-format).
If the record does not contain the defined fields, OnDecrypt MUST fail.

The keyring MUST decrypt the branch key according to the [AWS KMS Branch Key Decryption](#aws-kms-branch-key-decryption) section.

If the branch key fails to decrypt, OnDecrypt MUST fail.

If the decryption of the branch key succeeds, OnDecrypt verifies:

- The `KeyId` field in the AWS KMS response MUST equal the configured AWS KMS key identifier.

If the decryption and verification of the branch key succeeds:

- The keyring MUST construct Hierarchical Materials using the `Plaintext` value in the KMS response and
  the [`version`](../branch-key-store.md#record-format) value from the branch key record
- The keyring MUST put the constructed Hierarchical Materials in the cache using the
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
   [encryption materials](../structures.md#encryption-materials) in the same format as the serialization of
   [message header AAD key value pairs](../../data-format/message-header.md#key-value-pairs).

| Field               | Length (bytes) | Interpreted as                                                                           |
| ------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| "aws-kms-hierarchy" | 17             | UTF-8 Encoded                                                                            |
| branch-key-id       | Variable       | UTF-8 Encoded                                                                            |
| version             | 16             | Bytes                                                                                    |
| encryption context  | Variable       | [UTF-8 Encoded Key Value Pairs](<(../../data-format/message-header.md#key-value-pairs)>) |

If the keyring cannot serialize the encryption context, the operation MUST fail.

### AWS KMS Branch Key Decryption

The keyring MUST use the configured `KMS SDK Client` to decrypt the value of the branch key field.
The keyring MUST create a branch key [encryption context](../structures.md#encryption-context) map using
each attribute name from the AWS DDB response except the `enc` attribute as a key and each corresponding
attribute value as the value of the KMS Encryption Context.

- Each attribute value on the record MUST be transformed into its string representation.
- Attributes not defined in the [record format](../branch-key-store.md#record-format)
  are unspecified but SHOULD be included as part of the [encryption context](../structures.md#encryption-context).

When calling [AWS KMS Decrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html), the keyring MUST call with a request constructed as follows:

- `KeyId` MUST be the configured AWS KMS key identifier.
- `CiphertextBlob` MUST be the `enc` AWS DDB response value.
- `EncryptionContext` MUST be the branch key encryption context map.
- `GrantTokens` MUST be this keyring's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

## Appendix A: Cache Entry Identifier Formulas

When accessing the underlying cryptographic materials cache,
the hierarchical keyring MUST use the formulas specified in this appendix
in order to compute the [cache entry identifier](../cryptographic-materials-cache.md#cache-identifier).

### Preliminaries

Each of the cache entry identifier formulas includes serialized information related to the branch key,
as defined in the [Key Provider Info](../structures.md#key-provider-information).

### Encryption Materials

When the hierarchical keyring receives an OnEncrypt request,
the cache entry identifier MUST be calculated as the first 32 bytes of the
SHA-512 hash of the following byte strings, in the order listed:

| Field                    | Length (bytes) | Interpreted as |
| ------------------------ | -------------- | -------------- |
| Length of branch-key-id  | 3              | UInt8          |
| branch-key-id            | Variable       | UTF-8 Encoded  |
| Null Byte                | 1              | `0x00`         |
| Constant string "ACTIVE" | 6              | UTF-8 Encoded  |

As a formula:

```
branch-key-id = UTF8Encode(hierarchicalKeyring.BranchKeyIdentifier)
branch-key-digest - SHA512(branch-key-id)

ENTRY_ID = SHA512(
    LengthUint8(branch-key-id) +
    branch-key-digest +
    + 0x00
    + UTF8Encode("ACTIVE")
)[0:32]
```

### Decryption Materials

When the hierarchical keyring receives an OnDecrypt request,
it MUST calculate the cache entry identifier as the first 32 bytes of the SHA-512 hash of the following byte strings, in the order listed:

| Field                   | Length (bytes) | Interpreted as |
| ----------------------- | -------------- | -------------- |
| Length of branch-key-id | 3              | UInt8          |
| branch-key-id           | Variable       | UTF-8 Encoded  |
| Null Byte               | 1              | `0x00`         |
| Branch key version      | 36             | String         |

```
branch-key-id = UTF8Encode(edk.providerInfo)
branch-key-digest - SHA512(branch-key-id)

ENTRY_ID = SHA512(
    LengthUint8(branch-key-id) +
    branch-key-digest +
    0x00 +
    branch key version
)[0:32]
```

## Appendix B: Security Considerations for Branch Key Rotation

Branch Keys are not used to wrap plaintext data keys; instead they are used to derive unique `derivedBranchKeys`.
The `derivedBranchKeys` are responsible for wrapping plaintext data keys set on the [encryption materials](../structures.md#encryption-materials).

Branch Keys have a limit on how many times they are able to derive a `derivedBranchKey` before a theoretical collision.

To derive a `derivedBranchKey` the Keyring uses a 16 byte salt for the KDF.
Additionally the keyring uses a 12-byte IV for the AES-GCM-256 for key wrapping.
We have selected to use these `salt` and `IV` parameters as they are the same parameters used
in [AWS KMS key derivation](https://rwc.iacr.org/2018/Slides/Gueron.pdf).

Overall this results in 28-bytes of randomness.

Birthday Problem calculations for current selection:

```
16 + 12 = 28-bytes or 224-bits of randomness

(224 - 32) / 2 = 96

2^96 = 7.9228163e+28 or 79,228,162,514,264,337,593,543,950,336
```

The above number is how many times one would have to wrap with the `derivedBranchKey` before a theoretical collision.
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

The above number is how many times one would have to wrap with the `derivedBranchKey` before a theoretical collision.
Althought this is a higher number we decided on the current selection of including a salt and an IV to not only
lower the overhead of bytes we have to store in the [edk ciphertext](../structures.md#ciphertext) but to
easily reason about the security properties of the key derivation since it is what AWS KMS does.
