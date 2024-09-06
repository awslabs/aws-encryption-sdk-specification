[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Cache Across Hierarchy Keyrings

## Affected Features

This serves as a reference of all features that this change affects.

| Feature                                                                                 |
| --------------------------------------------------------------------------------------- |
| [Key Store](../../framework/branch-key-store.md)                                        |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                                                                           |
| --------------------------------------------------------------------------------------- |
| [Key Store](../../framework/branch-key-store.md)                                        |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |

## Affected Implementations

| Language | Version Introduced | Version Removed | Implementation                                                                                                                                                                                                                                                                                      |
| -------- | ------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dafny    | 1.4.0              | n/a             | [AwsKmsHierarchicalKeyring.dfy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/src/Keyrings/AwsKms/AwsKmsHierarchicalKeyring.dfy)                                                          |
| Java     | 1.4.0              | n/a             | [CreateAwsKmsHierarchicalKeyringInput.java](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/java/src/main/smithy-generated/software/amazon/cryptography/materialproviders/model/CreateAwsKmsHierarchicalKeyringInput.java) |
| .NET     | 1.4.0              | n/a             | [CreateAwsKmsHierarchicalKeyringInput.cs](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/net/Generated/AwsCryptographicMaterialProviders/CreateAwsKmsHierarchicalKeyringInput.cs)                                         |

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Definitions

An "MPL Consumer" is a library, service, or other application
that uses the AWS Cryptographic Material Providers Library (MPL)
to manage cryptographic materials.
An "MPL Consumer" MAY be using an AWS Crypto Tools product,
such as the AWS Encryption SDK or AWS Database Encryption SDK.

By "KMS Relationship", we mean any or all of the following:

- KMS Configuration
- Credentials used when creating the KMS Client, and thus used when calling KMS
- Other properties of the KMS Client, such as the region, or request headers

## Background

A [Cryptographic Materials Cache](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/cryptographic-materials-cache.md) can be used by a Hierarchy Keyring, a Caching CMM, and the DB-ESDK for Searchable Encryption.
It can store four types of [materials](https://github.com/aws/aws-cryptographic-material-providers-library/blob/c07a51fc29ff70411f7573bca96d2a091db8c1ed/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/Model/cryptographic-materials-cache.smithy#L89) for three different use-cases:

- Hierarchy Keyring: BranchKeyMaterials
- CachingCMM: EncryptionMaterials and DecryptionMaterials
- DB-ESDK (Searchable Encryption): BeaconKeyMaterials

These materials have certain cache identifiers for accessing
them until a TTL. As of [today](#today), the cache identifiers
are set up such that:

- Only one Hierarchy Keyring can use one cache,
  i.e., currently, we do NOT support a shared cache
  between multiple Hierarchy Keyrings.
- Multiple CachingCMMs can use a single shared cache
  (this is for native language implementations only,
  there is, currently, no CachingCMM implemented
  in Dafny)
- We do NOT support a shared cache between multiple
  Searchable Encryption Configurations.

We will focus on the Hierarchy Keyring unless mentioned
otherwise. Our aim is to support a shared cache between
multiple Hierarchy Keyrings
as highlighted in the next sections.

## Motivation

The Hierarchy Keyring,
and it's component the (Branch) Key Store,
allow MPL Consumers to reduce their KMS Call volume
by persisting KMS protected cryptographic materials into
an available medium
(currently, only a DynamoDB table is available as persistence medium).

We call these cryptographic materials Branch Keys.

However, an instance of the Hierarchy Keyring
can only ever call KMS with one KMS Relationship,
which is, at least partly,
configured on the KMS Client determined
at the Hierarchy Keyring's construction.

By KMS Relationship, we mean any or all of the following:

- KMS Configuration
- Credentials used when creating the KMS Client, and thus
  used when calling KMS
- Other properties of the KMS Client, such as the region,
  or request headers

The Local Cryptographic Material Cache of
the Hierarchy Keyring instance is then only
populated with Branch Keys that correspond with
that KMS relationship.

Which is appropriate,
as it is clear under what KMS relationship
a Branch Key is accessed.

However,
the Hierarchy Keyring,
and it's Key Store,
have a runtime cost,
exerting memory pressure
and, without manual optimization,
requiring at least 2 TLS handshakes
when first serving a request
(TLS to KMS & TLS to DDB).

Additionally,
the local Cryptographic Materials Cache
exerts some runtime cost,
particularly in a multi-threaded environment,
when a background worker thread MAY be refreshing
or pruning entries of the cache.

For MPL Consumers that MUST work with Branch Keys
under different KMS Relationships,
this runtime cost adds up.

These MPL Consumers MAY end up establishing
a LRU Cache of Hierarchy Keyrings.
Which, while workable, is sub-optimal,
and clearly makes the Hierarchy Keyring,
in these conditions,
"Hard to Use".

The objective, with these changes,
is to make the Hierarchy Keyring
"Easy to Use" in a multiple KMS Relationship
environment.

## Summary

To improve the MPL Consumer data key caching experience,
when using the Hierarchy Keyring,
we need to allow caching across Key Stores/KMS Clients/KMS Keys.

To facilitate Caching across Key Stores/KMS Clients/KMS Keys,
we MUST break the Cryptographic Materials Cache (CMC)
out of the Hierarchy Keyring.

By allowing MPL Consumers to optionally provide an initialized shared CMC
to the Hierarchy Keyring at construction,
the CMC MAY cache Branch Keys protected by different
KMS Relationships.

This simplifies Multiple KMS Relationship MPL Consumers,
as they do not need to stand up a LRU Cache of Hierarchy Keyrings.

Instead, they may maintain one CMC.
They still create a Hierarchy Keyring instance per KMS Relationship,
and they MUST use the correct Keyring to retrieve material
from the Cache.

But they only need to maintain the common cache.

In the future, the CachingCMM will be introduced to
Crypto Tool's Dafny products.
The CachingCMM and the Hierarchy Keyring both consume CMCs.
Thus, it will be possible to provide a CMC to both a
Hierarchy Keyring & a CachingCMM.
This cache identifier design MUST consider
how the cache entries of multiple Hierarchy Keyrings
and CachingCMMs will be appropriately separated.

## Requirements

- We must allow caching across Key Stores/KMS Clients/KMS Keys
  for multiple Hierarchy Keyrings and CachingCMMs.
  For this, we need to strategically update the cache identifiers
  for all materials ([background](#background)) in the CMC.
  The [Issues and Alternatives section](#issues-and-alternatives)
  discusses this.
- We MUST prevent Confused Deputy cases, i.e: The Wrong Branch Key
  Material being served
- Our solution MUST be Easy to Use, Hard to Misuse

## Out of Scope

- Supporting a shared Cache in the DB-ESDK to fetch
  BeaconKeyMaterials across multiple Searchable
  Encryption Configurations, or across multiple KMS Relationships.

## Issues and Alternatives:

Before looking at the issues, please take a quick look at
[Hierarchy Keyring Cache Identifier formula](#hierarchy-keyring-cache-identifier-formula),
[CachingCMM Cache Identifier formula](#cachingcmm-cache-identifier-formula), and
[DB-ESDK Searchable Encryption Cache Identifier formula](#db-esdk-searchable-encryption-cache-identifier-formula) for more context.

Note that there are currently two hashings taking place.
For example in the Hierarchy Keyring Cache Identifier formula,
one hash is for the branch-key-id and the other is hashing
the entire appended string
(a part of which is the hash of the branch-key-id)
to get the final cache identifier.
We'll call these internal and external hashes.

### Issue 1: How to update the cache identifier for the Hierarchy Keyring to allow a shared cache?

Note that according to the current
[Hierarchy Keyring Cache Identifier formula](#hierarchy-keyring-cache-identifier-formula),
if two KMS Relationships Hierarchy Keyrings are
called with two different Key Stores but the same branch-key-id,
there will be a collision (the branch-key-version will also
have to co-incide in case of Decryption Branch Key Materials).

#### Option 1 (Recommended): Adding a Resource ID, Scope ID, Partition ID, and Resource Suffix (recommended)

We establish the following "words" for the
Cache Entry Identifier formula:

- **Resource Identifier:**
  A Hex value, like Algorithm Suite ID, that indicates
  if an element is from a Caching CMM, Hierarchy Keyring,
  or some other future resource (say Lock Box)

  - Caching_CMM : `0x01` (0001)
  - Hierarchy_Keyring : `0x02` (0010)

- **Scope Identifier:**
  A Hex value, like Algorithm Suite ID, that indicates
  if an element is used for Encryption, Decryption,
  Searchable Encryption, or some other future
  purpose (maybe Lock Box).

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
  The constructor of the Hierarchy Keyring MUST
  record these bytes at construction time.
  This also makes the Hierarchy Keyring Partition ID
  in-line with the Partition ID of the Caching CMM.

- **Resource Suffix:**
  There are, at this time, 5 resource suffixes:
  - CCM: Encryption Materials, Without Algorithm Suite:
    ```
    0x00
    + SerializeEncryptionContext(getEncryptionMaterialsRequest.encryptionContext)
    ```
  - CCM: Encryption Materials, With Algorithm Suite:
    ```
    0x01
    + AlgorithmSuiteId(getEncryptionMaterialsRequest.algorithmSuite)
    + SerializeEncryptionContext(getEncryptionMaterialsRequest.encryptionContext)
    ```
  - CCM: Decryption Materials:
    ```
    AlgorithmSuiteId(decryptMaterialsRequest.algorithmSuite)
    + CONCATENATE(SORTED(EDK))
    + SerializeEncryptionContext(decryptMaterialsRequest.encryptionContext)
    ```
  - H-Keyring: Encryption Materials:
    ```
    UTF8Encode(branchKeyId)
    + logicalKeyStoreName
    ```
  - H-Keyring: Decryption Materials:
    ```
    UTF8Encode(branchKeyId)
    + logicalKeyStoreName
    + branchKeyVersion
    ```

The final recommendation regarding cache identifiers
is to join the aforementioned 4 words
(Resource Identifier, Scope Identifier, Partition ID,
and Resource Suffix) with the null byte, 0x00,
and take the SHA of the result.

#### Option 2: Using Key Store ID instead of Partition ID

The Hierarchy Keyring holds the Key Store and the
underlying CMC. The Key Store ID is a parameter of
the keystore. Instead of saying that the
Hierarchy Keyring uses the Key Store ID from the
Key Store to determine if the cache is shared or not,
we should include a partition ID
(mentioned in the previous option), which is held directly
by the Hierarchy Keyring. This will be easier for
customers to reason about.

This also, like I mentioned before, makes the
Hierarchy Keyring cache identifier usage in-line with
the Caching CMM cache identifier. which uses the
partition ID for every caching CMM to determine
if caches are shared or not.

Using the Key Store ID,
a property not necessarily bound to only one
instance of a Hierarchy Keyring,
introduces the following risks:

- Time-To-Live is not a property of the Key Store,
  but of the Hierarchy Keyring. Thus, two Hierarchy
  Keyrings with different Time-To-Live configurations
  but the same Key Store will share entries. This is
  mitigated elsewhere, but it is good it is prevented
  by the identifier as well.
- Branch Key ID Supplier is, likewise, not a property
  of the Key Store but of the Hierarchy Keyring.
  Thus, two Hierarchy Keyrings with the same Key Store
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
Double hashing, as I discuss in the next issue,
is only done to prevent length extension attacks and
can be mitigated by a different (more cleaner)
technique: Using SHA384 instead of SHA512.

### Issue 2: SHA512 vs SHA384 and do we need double hashing of cache identifiers?

Before we discuss the differences between SHA512
and SHA384, I want to mention here that SHA384 is
created by creating a SHA512 hash and then truncating
to take the first 48 out of 64 bytes and ignoring
the other 16.

If you look at the cache identifiers right now,
they have a pattern of double hashing.
For instance in the Hierarchy Keyring encrypt identifier,
the branch-key-digest (which is SHA(branch-key-id))
is created and appended to the length of the branch
key and activeUtf8 (details of what is appended is
not important for this question and is discussed in Issue 1).
A hash of the appended blob is then taken to generate the
cache identifier. This means that the branch-key-digest is
hashed again after appending some other relevant bytes.

#### Option 1: SHA384 and no double hashing (recommended)

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

### Issue 3: How to include the shared cache parameter in the Hierarchy Keyring input?

#### Option 1: Add it to the CacheType union in the [cryptographic-materials-cache.smithy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/3ffe9f801fc625381d26aead2dc66e6e5cd83f1c/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/Model/cryptographic-materials-cache.smithy#L213) (recommended)

This option allows us to have only one CacheType union.
This also gets rid of any confusions with using other types
of caches (like in the next option).

#### Option 2: Add an optional input parameter to the CreateAwsKmsHierarchicalKeyringInput

If we add an optional input parameter, the customer will
see two optional input parameters for providing a cache,
first for providing a cache to be used by only one
Hierarchy Keyring, and second for providing a cache
potentially shared across hierarchy keyrings.
If the customer provides both, we will have to
throw an error. Option 0 buries this error one layer
deeper and is easier to use for the customer without
throwing unnecessary errors. We also avoid having two
input parameters that both take a cache, which isn't intuitive.

### Issue 4: What should we name the shared cache parameter in the CacheType union?

#### Option 1: shared

Shared cache aligns with what we want to say and it is
more intuitive. We are introducing a shared cache across
multiple hierarchy keyrings and should follow that
nomenclature. How the cache is provided are details that
we can mention in the examples / developer guide.

#### Option 2: initialized

For using the cache, the customer needs to initialize the
cache before the creation of the hierarchy keyring, when
in all the other cases the cache is initialized by the
Hierarchy Keyring and the customer just specifies the type.
One more consideration is that customers can create a
custom CMC and provide it to the initialized cache,
which does not need to be shared.

## How can we ensure all the new cache identifiers are collision resistent?

Based on [Option 1 in Issue 1](#option-1-recommended-adding-a-resource-id-scope-id--partition-id-and-resource-suffix-recommended),
the Resource ID and Scope ID make the
Caching CMM Encrypt /
Caching CMM Decrypt /
Hierarchy Keyring Encrypt
/ Hierarchy Keyring Decrypt distinct.

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
2. operation count
3. total bytes through the system

While we understand the importance of all these elements,
currently, only the TTL is in-scope for this change.
We MUST consider the other two when we look at the Caching CMM
because a lot of the implementation there will overlap with
that of the Hierarchy Keyring.

## What if two Hierarchy Keyrings having different TTLs share a cache?

TTL is provided as an optional parameter to a
Hierarchy Keyring at time of initialization.
As per the current implementation, if two Hierarchy Keyrings
have different TTLs, the cache will set the expiry time of
the cached material according to the TTL of the keyring that
puts the element in the cache.

Therefore, if the other keyring with a different TTL
gets the element, the TTL will be wrong.

Let us say that we have a Hierarchy Keyrings K1 and K2 with
TTLs 5000s and 5s. K1 populates the cache at time t = 0,
and K2 fetches materials from the cache at t = 10s.
Based on the current implementation, K2 will be able to
use a material which is older than the TTL specified in K2.

We mitigate this by making sure that if the material exists
in the cache, the TTL has not expired for the keyring getting
the material. If it has, we basically assume that the material
is expired, and we re-populate the cache by decrypting
the materials again.

## Cache Identifier Formulae

### Hierarchy Keyring Cache Identifier formula

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
- For single-tenant, the customer sets the key-id directly in the config. For multi-tenant, they set an attribute name, and the key comes out of that attribute of the item.

## Birthday Bound for SHA512 and SHA384

A [birthday attack](https://en.wikipedia.org/wiki/Birthday_attack)
is a bruteforce collision attack that exploits the
mathematics behind the birthday problem in probability
theory. This attack can be used to abuse communication
between two or more parties. The attack depends on the
higher likelihood of collisions found between random
attack attempts and a fixed degree of
permutations (pigeonholes). With a birthday attack,
if we have a total of n bits output and therefore
$2^n$ different outputs, it is possible to find a
collision of a hash function with 50% chance by
calculating approximately $sqrt(2^n) = 2^{n/2}$ hashes.

To find a random collision in a SHA512 hash with
probability 0.5, we would need to calculate
approximately $2^256$ hashes. Similarly for SHA384,
we would need to calculate $2^192$ hashes.
Therefore, SHA512 is more collision resistant.

## Appendix

## A1: Relating Cache Entries (Branch Keys) to KMS Relationships

For some MPL Consumers,
Cache Entries SHOULD only be served IF
the request is being served under the same KMS Relationship,
which is the most secure condition,
as it prevents a Confused Deputy scenario.

To facilitate this,
the Cache Entry Identifier SHOULD
describe the KMS Relationship,
as well as the Logical Key Store Name,
Branch Key ID,
and Branch Key Name.

We can use existing features to accomplish this;
The Key Store constructor takes an optional [ID](../../framework/branch-key-store.md#keystore-id)
parameter at construction.

We can use this [ID](../../framework/branch-key-store.md#keystore-id)
to label the KMS Relationship of a particular Key Store instance.

MPL Consumers who want to garbage collect Key Store instances,
but still retain the ability to serve cached results,
MAY then set this [ID](../../framework/branch-key-store.md#keystore-id)
intelligently.

For example, imagine we have `N` KMS Relationships,
one of which is `X`,
which are used when retrieving Branch Keys, `n'`,
one of which is `x'`.

A common Cryptographic Materials Cache is established
across all `N` Hierarchical Keyrings used to serve `n'`.

But the Keyrings are routinely garbage collected,
only the common cache remains "in scope" indefinitely.

Whenever `x'` is needed,
a new KMS Client is created that respects relationship `X`,
which is then used to create Key Store Identified as `X`,
and the Key Store is used to create a Hierarchical Keyring
that uses the common Cache.

All entries in this common Cache from that hierarchal Keyring
MUST have a cache identifier that uniquely represents `X`.

When the Hierarchical Keyring for `X` gets garbage collected,
the cache entries MAY remain.

But to retrieve an entry,
the MPL Consumer SHOULD recreate

> a KMS Client is created that respects relationship `X`,
> which is then used to create Key Store Identified as `X`,
> and the Key Store is used to create a Hierarchical Keyring
> that uses the common Cache.

If the Cache Entry is still valid
(the TTL has not expired),
it can be served without any KMS or DDB requests.

If not, the recreated Hierarchy Keyring
is used to refresh it.

### Today

09/05/2024
