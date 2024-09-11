[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Cache Across Hierarchical Keyrings

## Background

A [Cryptographic Materials Cache](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/cryptographic-materials-cache.md) can be used by a Hierarchical Keyring, a Caching CMM, and the DB-ESDK for Searchable Encryption.
It can store four types of [materials](https://github.com/aws/aws-cryptographic-material-providers-library/blob/c07a51fc29ff70411f7573bca96d2a091db8c1ed/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/Model/cryptographic-materials-cache.smithy#L89) for three different use-cases:

- Hierarchical Keyring: BranchKeyMaterials
- CachingCMM: EncryptionMaterials and DecryptionMaterials
- DB-ESDK (Searchable Encryption): BeaconKeyMaterials

These materials have certain cache identifiers for accessing
them until a TTL. As of the date of creation of this document (09/13/12024),
the cache identifiers are set up such that:

- Only one Hierarchical Keyring can use one cache,
  i.e., currently, we do NOT support a shared cache
  between multiple Hierarchical Keyrings.
- Multiple CachingCMMs can use a single shared cache
  (this is for native language implementations only,
  there is, currently, no CachingCMM implemented
  in Dafny)
- We do NOT support a shared cache between multiple
  Searchable Encryption Configurations.

## Goals

- We must allow caching across Key Stores/KMS Clients/KMS Keys
  for multiple Hierarchical Keyrings and CachingCMMs.
  For this, we need to strategically update the cache identifiers
  for all materials ([background](#background)) in the CMC.
- We MUST prevent Confused Deputy cases, i.e: the wrong Branch Key
  Material being served
- Our solution MUST be Easy to Use, Hard to Misuse

## Out of Scope

- Supporting a shared Cache in the DB-ESDK to fetch
  BeaconKeyMaterials across multiple Searchable
  Encryption Configurations, or across multiple KMS Relationships.

## Issues and Alternatives:

Before looking at the issues, please take a quick look at
[Hierarchical Keyring Cache Identifier formula](#hierarchical-keyring-cache-identifier-formula),
[CachingCMM Cache Identifier formula](#cachingcmm-cache-identifier-formula), and
[DB-ESDK Searchable Encryption Cache Identifier formula](#db-esdk-searchable-encryption-cache-identifier-formula) for more context.

Note that there are currently two hashings taking place.
For example in the Hierarchical Keyring Cache Identifier formula,
one hash is for the branch-key-id and the other is hashing
the entire appended string
(a part of which is the hash of the branch-key-id)
to get the final cache identifier.
We'll call these internal and external hashes.

_Preferred options are in italics._

### Issue 1: How to update the cache identifier for the Hierarchical Keyring to allow a shared cache?

Note that according to the current
[Hierarchical Keyring Cache Identifier formula](#hierarchical-keyring-cache-identifier-formula),
if two KMS Relationships Hierarchical Keyrings are
called with two different Key Stores but the same branch-key-id,
there will be a collision (the branch-key-version will also
have to co-incide in case of Decryption Branch Key Materials).

#### _Option 1 (Recommended): Adding a Resource ID, Scope ID, Partition ID, and Resource Suffix (recommended)_

We establish the following definitions for the
Cache Entry Identifier formula:

- **Resource Identifier:**
  A Hex value that indicates
  if an element is from a Caching CMM, Hierarchical Keyring,
  or some other future resource.

  - Caching_CMM : `0x01` (0001)
  - Hierarchical_Keyring : `0x02` (0010)

- **Scope Identifier:**
  A Hex value that indicates
  if an element is used for Encryption, Decryption,
  Searchable Encryption, or some other future
  purpose.

  - Encrypt : `0x01` (0001)
  - Decrypt : `0x02` (0010)
  - Searchable Encryption : `0x03` (0011)

- **Partition ID:**
  Either a String provided by user, which MUST be
  interpreted as the bytes of UTF-8 Encoding of the
  String, or a v4 UUID, which SHOULD be interpreted
  as the 16 byte representation of the UUID.
  Note: The Cache will not know if this ID is a
  String set by the user or the UUID.
  The constructor of the Hierarchical Keyring MUST
  record these bytes at construction time.
  This also makes the Hierarchical Keyring Partition ID
  in-line with the Partition ID of the Caching CMM.

- **Resource Suffix:**
  There are, at this time, 5 resource suffixes:
  - Hierarchical Keyring: Encryption Materials:
    ```
    logicalKeyStoreName + NULL_BYTE + UTF8Encode(branchKeyId)
    ```
  - Hierarchical Keyring: Decryption Materials:
    ```
    logicalKeyStoreName + NULL_BYTE + UTF8Encode(branchKeyId) + NULL_BYTE + UTF8Encode(branchKeyVersion)
    ```
  - Caching CMM: Encryption Materials, Without Algorithm Suite:
    ```
    0x00 + NULL_BYTE + SerializeEncryptionContext(getEncryptionMaterialsRequest.encryptionContext)
    ```
  - Caching CMM: Encryption Materials, With Algorithm Suite:
    ```
    0x01 + NULL_BYTE + AlgorithmSuiteId(getEncryptionMaterialsRequest.algorithmSuite) + NULL_BYTE + SerializeEncryptionContext(getEncryptionMaterialsRequest.encryptionContext)
    ```
  - Caching CMM: Decryption Materials:
    ```
    AlgorithmSuiteId(decryptMaterialsRequest.algorithmSuite) + NULL_BYTE + CONCATENATE(SORTED(EDK)) + NULL_BYTE + SerializeEncryptionContext(decryptMaterialsRequest.encryptionContext)
    ```

The final recommendation regarding cache identifiers
is to join the aforementioned 4 words
(Resource Identifier, Scope Identifier, Partition ID,
and Resource Suffix) with the null byte, 0x00,
and take the SHA384 of the result.

#### Option 2: Using Key Store ID instead of Partition ID

The Hierarchical Keyring holds the Key Store and the
underlying CMC. The Key Store ID is a parameter of
the keystore. Instead of saying that the
Hierarchical Keyring uses the Key Store ID from the
Key Store to determine if the cache is shared or not,
we should include a partition ID
(mentioned in the previous option), which is held directly
by the Hierarchical Keyring.

This also, like mentioned before, makes the
Hierarchical Keyring cache identifier usage in-line with
the Caching CMM cache identifier. which uses the
partition ID for every caching CMM to determine
if caches are shared or not.

Using the Key Store ID,
a property not necessarily bound to only one
instance of a Hierarchical Keyring,
introduces the following risks:

- Time-To-Live is not a property of the Key Store,
  but of the Hierarchical Keyring. Thus, two Hierarchical
  Keyrings with different Time-To-Live configurations
  but the same Key Store will share entries. This is
  mitigated elsewhere, but it is good it is prevented
  by the identifier as well.
- Branch Key ID Supplier is, likewise, not a property
  of the Key Store but of the Hierarchical Keyring.
  Thus, two Hierarchical Keyrings with the same Key Store
  but different Branch Key ID Suppliers would share entries.
  Though there is no threat, as the Branch Key ID Supplier
  or statically bound Branch Key ID will prevent any out of
  scope Branch Key IDs from being served.

Ultimately,
it appears best to have the component that reads and
writes to the Cache identify itself,
as compared to using an Identity of a property/component
bound to it;
the Key Store only determines SOME of the properties of
the cached entries.
The Keyring determines ALL of the properties.

#### Option 3: Double hashing the cache identifiers

If you look at the cache identifiers right now,
they have a pattern of double hashing.
Double hashing, as discussed in the next issue,
is only done to prevent length extension attacks and
can be mitigated by a different (more cleaner)
technique: Using SHA384 instead of SHA512.

### Issue 2: SHA512 vs SHA384 and do we need double hashing of cache identifiers?

Before we discuss the differences between SHA512
and SHA384, please note that SHA384 is
created by calculating a SHA512 hash and then truncating
to take the first 48 out of 64 bytes and ignoring
the other 16.

If you look at the cache identifiers right now,
they have a pattern of double hashing.
For instance in the Hierarchical Keyring encrypt identifier,
the branch-key-digest (which is SHA(branch-key-id))
is created and appended to the length of the branch
key and activeUtf8 (details of what is appended is
not important for this question and is discussed in Issue 1).
A hash of the appended blob is then taken to generate the
cache identifier. This means that the branch-key-digest is
hashed again after appending some other relevant bytes.

#### _Option 1: SHA384 and no double hashing (recommended)_

SHA-384 is immune to length extension attacks and provides
enough cryptographic security for the hash.
Therefore, SHA384 is the preferred method.
Choosing SHA384 also helps in resolving [this issue](#how-can-we-ensure-that-there-are-no-cache-identifier-collisions-between-the-to-be-implemented-dafny-and-native-caching-cmms).

#### Option 2: SHA512

SHA512 has a bigger output space [[ref](#birthday-bound-for-sha512-and-sha384)]
since the 64 byte output hash is not truncated to 48 bytes.
However, the additional output size doesn't add anything
and SHA384 uses the same algorithm.
The additional bytes can be removed to get immunity from
length extension attacks, among other things discussed above.

### Issue 3: How to include the shared cache parameter in the Hierarchical Keyring input?

#### _Option 1: Add it to the CacheType union in the [cryptographic-materials-cache.smithy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/3ffe9f801fc625381d26aead2dc66e6e5cd83f1c/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/Model/cryptographic-materials-cache.smithy#L213) (recommended)_

This option allows us to have only one CacheType union.
This also gets rid of any confusions with using other types
of caches (like in the next option).

#### Option 2: Add an optional input parameter to the CreateAwsKmsHierarchicalKeyringInput

If we add an optional input parameter, customers will
see two optional input parameters for providing a cache,
first for providing a cache to be used by only one
Hierarchical Keyring, and second for providing a cache
potentially shared across Hierarchical Keyrings.
If the customer provides both, we will have to
throw an error. Option 1 buries this error one layer
deeper and is easier to use for the customer without
throwing unnecessary errors. With Option 1, we also avoid having two
input parameters that both take a cache, which isn't intuitive.

### Issue 4: What should we name the shared cache parameter in the CacheType union?

#### _Option 1: shared_

Shared cache aligns with what we want to say and it is
more intuitive. We are introducing a shared cache across
multiple Hierarchical Keyrings and should follow that
nomenclature. How the cache is provided are details that
we can mention in the examples / developer guide.

#### Option 2: initialized

For using the cache, the customer needs to initialize the
cache before the creation of the Hierarchical Keyring, when
in all the other cases the cache is initialized by the
Hierarchical Keyring and the customer just specifies the type.
One more consideration is that customers can create a
custom CMC and provide it to the initialized cache,
which does not need to be shared.

## How can we ensure all the new cache identifiers are collision resistent?

Based on [Option 1 in Issue 1](#option-1-recommended-adding-a-resource-id-scope-id--partition-id-and-resource-suffix-recommended),
the Resource ID and Scope ID make the
Caching CMM Encrypt /
Caching CMM Decrypt /
Hierarchical Keyring Encrypt
/ Hierarchical Keyring Decrypt distinct.

## How can we ensure that there are no cache identifier collisions between the (to-be-implemented) Dafny and native Caching CMMs?

The cache identifiers for the native Caching CMM
use SHA512 hash which has 64 bytes of output.
The new cache identifiers for the caching CMM use
SHA384 hash which has 48 bytes of output.
There will NEVER be a collision between the two.

## Properties of Cryptographic Materials Cache

There are three element of a cryptographic cache that
security engineers want to control:

1. Time to Live (TTL)
2. Operation count
3. Total bytes through the system

While we understand the importance of all these elements,
currently, only the TTL is in-scope for this change.
We MUST consider the other two when we look at the Caching CMM
because a lot of the implementation there will overlap with
that of the Hierarchical Keyring.

## What if two Hierarchical Keyrings having different TTLs share a cache?

TTL is provided as an optional parameter to a
Hierarchical Keyring at time of initialization.
As per the current implementation, if two Hierarchical Keyrings
have different TTLs, the cache will set the expiry time of
the cached material according to the TTL of the keyring that
populates the element in the cache.

Therefore, if the other keyring with a different TTL
gets the element, the TTL will be wrong.

Let us say that we have a Hierarchical Keyrings K1 and K2 with
TTLs 5000s and 5s. K1 populates the cache at time t = 0,
and K2 fetches materials from the cache at t = 10s.
Based on the current implementation, K2 will be able to
use a material which is older than the TTL specified in K2.

We mitigate this by making sure that if the material exists
in the cache, the TTL has not expired for the keyring getting
the material. If it has, we basically assume that the material
is expired, and we re-populate the cache by decrypting
the BranchKeyMaterials again.

## Cache Identifier Formulae

### Hierarchical Keyring Cache Identifier formula

- [Encrypt](https://github.com/aws/aws-cryptographic-material-providers-library/blob/c07a51fc29ff70411f7573bca96d2a091db8c1ed/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/src/Keyrings/AwsKms/AwsKmsHierarchicalKeyring.dfy#L384)
  - [[spec]](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/aws-kms/aws-kms-hierarchical-keyring.md#encryption-materials)
    ```
      SHA512(
        len_branch_key
        + SHA512(branch_key_id_utf8)
        + [0x00]
        + activeUtf8
        )[0..32]
    ```
  - The SHA512(branch_key_id_utf8) is called the branch-key-digest
- [Decrypt](https://github.com/aws/aws-cryptographic-material-providers-library/blob/c07a51fc29ff70411f7573bca96d2a091db8c1ed/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/src/Keyrings/AwsKms/AwsKmsHierarchicalKeyring.dfy#L725)
  - [[spec]](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/aws-kms/aws-kms-hierarchical-keyring.md#decryption-materials)
    ```
      SHA512(
        len_branch_key
        + branch_key_id_utf8
        + [0x00 as uint8]
        + UTF8.EncodeAscii(branchKeyVersion)
        )[0..32]
    ```
- The length of cache identifier for BranchKeyMaterials
  is 32 bytes for both Encrypt and Decrypt.

### CachingCMM Cache Identifier formula

- For python native (Note: There is no CachingCMM implemented in dafny yet):
  - [Encrypt](https://github.com/aws/aws-encryption-sdk-python/blob/1a1213a31776477dcc4aab44b2a4dc2eb514113e/src/aws_encryption_sdk/caches/__init__.py#L55): as per [spec](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/caching-cmm.md#appendix-a-cache-entry-identifier-formulas)
    - Encrypt without Algorithm suite specified
      ```
      SHA512(
        SHA512(UTF8Encode(cachingCMM.partitionId))
        + 0x00
        + SHA512(SerializeEncryptionContext(getEncryptionMaterialsRequest.encryptionContext))
      )
      ```
    - Encrypt with Algorithm suite specified
      ```
      SHA512(
        SHA512(UTF8Encode(cachingCMM.partitionId))
        + 0x01
        + AlgorithmSuiteId(getEncryptionMaterialsRequest.algorithmSuite)
        + SHA512(SerializeEncryptionContext(getEncryptionMaterialsRequest.encryptionContext))
      )
      ```
  - [Decrypt](https://github.com/aws/aws-encryption-sdk-python/blob/1a1213a31776477dcc4aab44b2a4dc2eb514113e/src/aws_encryption_sdk/caches/__init__.py#L101): as per [spec](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/caching-cmm.md#appendix-a-cache-entry-identifier-formulas)
    ```
      EDK_HASHES = [SHA512(SerializeEncryptedDataKey(key)) for key in decryptMaterialsRequest.encryptedDataKeys]
      ENTRY_ID = SHA512(
        SHA512(UTF8Encode(cachingCMM.partitionId))
        + AlgorithmSuiteId(decryptMaterialsRequest.algorithmSuite)
        + CONCATENATE(SORTED(EDK_HASHES))
        + PADDING_OF_512_ZERO_BITS
        + SHA512(SerializeEncryptionContext(decryptMaterialsRequest.encryptionContext))
      )
    ```
- The length of cache identifier for EncryptionMaterials
  and DecryptionMaterials is 64 bytes.

### DB-ESDK Searchable Encryption Cache Identifier formula

- To fetch BeaconKeyMaterials from the
  CMC for Searchable Encryption,
  the cache identifier for a beacon key is a `key-id`. The key-id is a
  [string](https://github.com/aws/aws-database-encryption-sdk-dynamodb/blob/b5705ee12257fb18f867478bf17ba31f50c26c8b/DynamoDbEncryption/dafny/DynamoDbEncryption/src/SearchInfo.dfy#L185),
  and here is an example initialization
  [[ref](https://github.com/aws/aws-database-encryption-sdk-dynamodb/blob/b5705ee12257fb18f867478bf17ba31f50c26c8b/TestVectors/dafny/DDBEncryption/src/JsonConfig.dfy#L527)].
- The length of cache identifier for BeaconKeyMaterials is “variable” based on the key-id.
- For single-tenant, the customer sets the key-id directly in the config. 
  or multi-tenant, they set an attribute name, and the key comes out of that attribute of the item.

## Birthday Bound for SHA512 and SHA384

A [birthday attack](https://en.wikipedia.org/wiki/Birthday_attack)
is a bruteforce collision attack that exploits the
mathematics behind the birthday problem in probability
theory. This attack can be used to abuse communication
between two or more parties. The attack depends on the
higher likelihood of collisions found between random
attack attempts and a fixed degree of
permutations (pigeonholes). With a birthday attack for a hash function,
if we have total n bits of output and therefore
$2^n$ different outputs, it is possible to find a
collision of the hash function with 50% chance by
calculating approximately $sqrt(2^n) = 2^{n/2}$ hashes.

To find a random collision in a SHA512 hash with
probability 0.5, we would need to calculate
approximately $2^256$ hashes. Similarly for SHA384,
we would need to calculate $2^192$ hashes.
Therefore, SHA512 is more collision resistant.