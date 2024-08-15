[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Cache Across Hierarchy Keyrings

## Affected Features

This serves as a reference of all features that this change affects.

| Feature                                                                                 |
| --------------------------------------------------------------------------------------- |
| [Key Store](../../framework/branch-key-store.md)                                         |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                                                                           |
| --------------------------------------------------------------------------------------- |
| [Key Store](../../framework/branch-key-store.md)                                         |
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
  (this is for native languages, there is currently no
  CachingCMM implemented in dafny)
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

Relevant [sim](https://sim.amazon.com/issues/CrypTool-5311).

To improve the MPL Consumer data key caching experience,
when using the Hierarchy Keyring,
we need to allow caching across Key Stores/KMS Clients/KMS Keys.

To facilitate Caching across Key Stores/KMS Clients/KMS Keys,
we MUST break the Cryptographic Materials Cache (CMC)
out of the Hierarchy Keyring.

By allowing MPL Consumers to provide an already initialized CMC
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

## Out of Scope

- Supporting a shared Cache in the DB-ESDK to fetch
  BeaconKeyMaterials across multiple Searchable
  Encryption Configurations, or across multiple KMS Relationships.

## Issues and Alternatives:

Before looking at the issues, please take a quick look at
[Hierarchy Keyring Cache Identifier formula](#hierarchy-keyring-cache-identifier-formula),
[CachingCMM Cache Identifier formula](#cachingcmm-cache-identifier-formula), and
[DB-ESDK Searchable Encryption Cache Identifier formula](#db-esdk-searchable-encryption-cache-identifier-formula) for more context.

Note that there are two hashings taking place.
For example in the Hierarchy Keyring Cache Identifier formula,
one hash is for the branch-key-id and the other is hashing
the entire appended string
(a part of which is the hash of the branch-key-id)
to get the final cache identifier.
We'll call these internal and external hashes.

#### Issue 1: How to update the cache identifier for the Hierarchy Keyring to allow a shared cache?

Note that according to the current
[Hierarchy Keyring Cache Identifier formula](#hierarchy-keyring-cache-identifier-formula),
if two KMS Relationships Hierarchy Keyrings are
called with two different Key Stores but the same branch-key-id,
there will be a collision (the branch-key-version will also
have to co-incide in case of Decryption Branch Key Materials).

##### Option 1 (Recommended): Append the keystore-id to the [Hierarchy Keyring cache identifier formula](#hierarchy-keyring-cache-identifier-formula).

By appending the keystore-id to the
Hierarchy Keyring cache identifier,
we can ensure that there are no collisions between two identifiers
from different Key Stores.
More context on this can be found in the
[Appendix section A1](#a1-relating-cache-entries-branch-keys-to-kms-relationships).

##### Option 2: Append "unique numbers" to the cache identifiers of different keyrings

This is not practical for a multi-threaded system.
Also, we cannot keep track of these "unique numbers".

##### Option 3: Don't change anything.

As mentioned before, in-case of a shared cache,
there will be collisions while fetching materials
from multiple Hierarchy Keyrings.

#### Issue 2: Should we update the cache identifier for the Hierarchy Keyring BranchKeyMaterials to include branch-key-digest instead of branch-key-id?

Note that according to the current
[Hierarchy Keyring Cache Identifier formula](#hierarchy-keyring-cache-identifier-formula),
the [Hierarchy Keyring Branch Key Materials (Decryption) cache identifier](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/aws-kms/aws-kms-hierarchical-keyring.md#decryption-materials)
has branch-key-id appended in the cache identifier formula and the
[Branch Key Materials (Encryption) cache identifier](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/aws-kms/aws-kms-hierarchical-keyring.md#encryption-materials)
has branch-key-digest=SHA512(branch-key-id). Here we're talking
about the internal hash.

##### Option 1 (Recommended): Update the Decryption cache identifier to include branch-key-digest=SHA512(branch-key-id) instead of the branch-key-id

This will make both the Hierarchy Keyring Encryption and
Decryption cache identifiers more coherent.
The cache identifier input would be deterministic
irrespective of the size of branch-key-id that the
customer provides.
Additionally, if we're updating branch-key-id to
branch-key-digest, we can remove the branch-key-id-length
parameter in the formula and make it cleaner.
This has CryptoBR's approval
[[ticket]](https://issues.amazon.com/issues/P148158466).

##### Option 2: Update the Encryption cache identifier to include branch-key-id instead of the branch-key-digest=SHA512(branch-key-id)

Not hashing the branch keys will mean that the input
to the final hash function will be of variable length,
which is hard to reason about.

##### Option 3: Don't change anything.

This would mean that the formula will remain incoherent.

#### Issue 3: Which hashing algorithm (internal and external) should be used in the Hierarchy Keyring cache identifier and the CachingCMM?

Note that according to the
[cache identifier formulae](#cache-identifier-formulae),
as of [today](#today), the length of cache identifier for
BranchKeyMaterials in Hierarchy Keyring is 32 bytes for
both Encrypt and Decrypt and the length of cache identifier
for EncryptionMaterials and DecryptionMaterials in the
CachingCMM is 64 bytes.
Both Hierarchy Keyring and CachingCMM identifiers currently
use SHA512, but the Hierarchy Keyring cache identifier is
truncated to 32 bytes.

##### Option 1 (Recommended): Using SHA512 for both

SHA512 has more number of bits to represent the output
of the cache identifier strings. More information about
why this is true based on the birthday bound can be found
[here](#birthday-bound-for-sha512-and-sha384)
This is pending [CryptoBR guidance](https://t.corp.amazon.com/P148158466/communication).

##### Option 2: Change the hashing algorithm to SHA384 in both

SHA512 is the better choice as mentioned above.
More information about this can be found
[here in the appendix](#a3-information-about-sha384-and-length-extension-attacks),
where I discuss length extension attacks and why
SHA512 is still the better choice.

##### Option 3: Using different hashing algorithms

This would mean different cache identifiers will be
unnecesserily incoherent. Also this deviates from
CryptoBR's guidance.

#### Issue 4: Should we add a prefix to all cache identifiers in Hierarchy Keyrings and CachingCMMs?

Here, by prefix we mean, adding the UTF8 encoding
of the string 'hierarchy_keyring' as a
prefix to a hierarchy keyring cache identifier,
and adding encoding of 'caching_cmm' as a prefix to a
CachingCMM cache identifier.

##### Option 1 (Recommended): Yes

Note that after adding Key Store ID / partition ID to a
Hierarchy Keyring's cache identifier, multiple Hierarchy Keyrings
can use a shared cache. Multiple CachingCMMs can use a
shared cache already as mentioned in the [background](#background).
Adding prefixes is an additional safety measure to prevent any
possible collisions between a
Hierarchy Keyring and a CachingCMM.

##### Option 2: No

If we don't add prefixes, even though the chance of an
overlap is minimal, we might get collisions between a
Hierarchy Keyring and a CachingCMM cache identifier.
Adding prefixes adds another layer of distinction between them.

## How can we ensure cache identifiers are collision resistent?

To answer this question, I will use two approaches.

### Derivation from assumptions

For the HKeyring and CachingCMM, ensuring that all cache
identifiers are unique for all encrypts and decrypts
is simple if we just study the statements in the
[background](#background) and the fields we're
appending to the identifiers as discussed in issues
[1](#issue-1-how-to-update-the-cache-identifier-for-the-hierarchy-keyring-to-allow-a-shared-cache)
and [4](#issue-4-should-we-add-a-prefix-to-all-cache-identifiers-in-hierarchy-keyrings-and-cachingcmms).

Two HKeyrings WILL NOT have collisions if we append
a Key Store ID parameter to the identifier
(per issue
[1](#issue-1-how-to-update-the-cache-identifier-for-the-hierarchy-keyring-to-allow-a-shared-cache)).

Two CachingCMMs already allow shared cache.

Per issue
[4](#issue-4-should-we-add-a-prefix-to-all-cache-identifiers-in-hierarchy-keyrings-and-cachingcmms),
a Hierarchy Keyring and a CachingCMM idenitifier will
be distinct if we add the UTF8 encodings of prefixes
'hierarchy_keyring' (17 bytes) and 'caching_cmm' (11 bytes)
to each of them respectively.

### Distinct sizes of the identifiers

As an additional safety measure, we look closely
at the formulae for cache identifiers in a Hierarchy Keyring
and a CachingCMM encrypt and decrypt (note that these will
actually be a total of 5, since the
[cachingCMM encrypt cache identifier](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/caching-cmm.md#appendix-a-cache-entry-identifier-formulas)
has two different formulae based on if we
specify the algorithm suite or not).

In the
[Hierarchy Keyring Cache Identifier formula](#hierarchy-keyring-cache-identifier-formula)
Encrypt, as discussed before, we will remove the len_branch_key.
For Decrypt, we will remove the len_branch_key
and use the branch-key-digest in place of the branch-key-id.
The size of the inputs to the external hash for both these
cases then becomes:

- Encrypt: 17 (prefix) + 64 + 1 + 6 = 88 bytes
- Decrypt: 17 + 64 + 1 + 36 = 118 bytes

Similarly, after making the proposed updates in the
[CachingCMM Cache Identifier formula](#cachingcmm-cache-identifier-formula),
the size will be:

- Encrypt without Algorithm Suite specified: 11 (prefix) + 64 + 1 + 64 = 140 bytes
- Encrypt with Algorithm Suite specified: 11 + 64 + 1 + 2 + 64 = 142 bytes
- Decrypt: 11 + 64 + 2 + 64\*x + 64 + 64 = 205 + 64x bytes ; where x is the number of EDKs in the decrypt string

In addition to the explanations in the previous
[subsection](#derivation-from-assumptions),
all these input strings are also unique
because they have different lengths. We just need
to choose a good hashing algorithm which gives us a
very large output space to project these strings to
minimize collisions, and SHA512 will do the job.

## Cache Identifier Formulae

### Hierarchy Keyring Cache Identifier formula

- [Encrypt](https://github.com/aws/aws-cryptographic-material-providers-library/blob/c07a51fc29ff70411f7573bca96d2a091db8c1ed/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/src/Keyrings/AwsKms/AwsKmsHierarchicalKeyring.dfy#L384) - SHA512(len_branch_key + SHA512(branch_key_id_utf8) + [0x00] + activeUtf8)[0..32] [[spec]](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/aws-kms/aws-kms-hierarchical-keyring.md#encryption-materials)
  - The SHA512(branch_key_id_utf8) is called the branch-key-digest
- [Decrypt](https://github.com/aws/aws-cryptographic-material-providers-library/blob/c07a51fc29ff70411f7573bca96d2a091db8c1ed/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/src/Keyrings/AwsKms/AwsKmsHierarchicalKeyring.dfy#L725) - SHA512(len_branch_key + branch_key_id_utf8 + [0x00 as uint8] + UTF8.EncodeAscii(branchKeyVersion))[0..32] [[spec]](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/aws-kms/aws-kms-hierarchical-keyring.md#decryption-materials)
- The length of cache identifier for BranchKeyMaterials
  is 32 bytes for both Encrypt and Decrypt.

### CachingCMM Cache Identifier formula

- For python native (Note: There is no CachingCMM implemented in dafny yet):
  - [Encrypt](https://github.com/aws/aws-encryption-sdk-python/blob/1a1213a31776477dcc4aab44b2a4dc2eb514113e/src/aws_encryption_sdk/caches/__init__.py#L55): as per [spec](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/caching-cmm.md#appendix-a-cache-entry-identifier-formulas)
    - Encrypt without Algorithm suite specified
      - SHA512(
        SHA512(UTF8Encode(cachingCMM.partitionId)) + 0x00 + SHA512(SerializeEncryptionContext(getEncryptionMaterialsRequest.encryptionContext))
        )
    - Encrypt with Algorithm suite specified
      - SHA512(
        SHA512(UTF8Encode(cachingCMM.partitionId)) + 0x01 + AlgorithmSuiteId(getEncryptionMaterialsRequest.algorithmSuite) + SHA512(SerializeEncryptionContext(getEncryptionMaterialsRequest.encryptionContext))
        )
  - [Decrypt](https://github.com/aws/aws-encryption-sdk-python/blob/1a1213a31776477dcc4aab44b2a4dc2eb514113e/src/aws_encryption_sdk/caches/__init__.py#L101): as per [spec](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/caching-cmm.md#appendix-a-cache-entry-identifier-formulas)
    - EDK_HASHES = [SHA512(SerializeEncryptedDataKey(key)) for key in decryptMaterialsRequest.encryptedDataKeys]
    - ENTRY_ID = SHA512(
      SHA512(UTF8Encode(cachingCMM.partitionId)) + AlgorithmSuiteId(decryptMaterialsRequest.algorithmSuite) + CONCATENATE(SORTED(EDK_HASHES)) + PADDING_OF_512_ZERO_BITS + SHA512(SerializeEncryptionContext(decryptMaterialsRequest.encryptionContext))
      )
- The length of cache identifier for EncryptionMaterials
  and DecryptionMaterials is 64 bytes.

### DB-ESDK Searchable Encryption Cache Identifier formula

- To fetch BeaconKeyMaterials from the
  CMC for Searchable Encryption,
  the cache identifier for a beacon key is a key-id. The key-id is a
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
as it prevents a Confused Deputy scenario
(detailed in **Confused Deputy 1**).

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

## A2: Sub-requirements

- We must update the cache identifier for [Hierarchy Keyring Branch Key Materials (Decryption) cache identifier](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/aws-kms/aws-kms-hierarchical-keyring.md#decryption-materials) to have a branch-key-digest=SHA512(branch-key-id) appended, instead of a branch-key-id, just like in the [Branch Key Materials (Encryption) cache identifier](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/aws-kms/aws-kms-hierarchical-keyring.md#encryption-materials) [[ref: Hierarchy Keyring Cache Identifier formula]](#hierarchy-keyring-cache-identifier-formula).
- Minor update to the spec: The branch-key-version (which is the UUID) in the [Hierarchy Keyring Branch Key Materials (Decryption) cache identifier](https://github.com/awslabs/aws-encryption-sdk-specification/tree/ffb2b0cc6a956b2cec3a33be3c3672605b6907fb/framework/aws-kms/aws-kms-hierarchical-keyring.md#decryption-materials) is currently mentioned to be of size 36 bytes. However, the UUID is actually only 16 bytes. We get 36 bytes when we convert the 16 bytes in UUID to a UTF8 encoding. Therefore, the spec should mention that the branch-key-version has size 16 bytes [[ref: Hierarchy Keyring Cache Identifier formula]](#hierarchy-keyring-cache-identifier-formula).

## A3: Information about SHA384 and Length Extension Attacks

SHA384 computation speed is the same as that of SHA512 [[ref](https://news.ycombinator.com/item?id=27960348#:~:text=For%2064%2Dbit%20CPUs%20without,the%20algorithm%20is%20the%20same)].

However, SHA384 is not prone to
[Length Extension attacks](https://en.wikipedia.org/wiki/Length_extension_attack),
unlike SHA512, which is a plus for SHA384.
But, cache identifiers don't fall into the category
of length extension attacks, which come into the picture
when an attacker tries to reconstruct signatures of a
tampered message without knowing the original message.
Since the cache identifiers have nothing to do with signing,
we do NOT need to use SHA384.

### Today

08/12/2024
