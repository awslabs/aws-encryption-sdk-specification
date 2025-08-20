[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Define Branch Key Store read consistency semantics

# Definitions

## Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

# Background

The [branch key store](../../framework/branch-key-store.md) persists branch key versions
in a persistent data store such as a DynamoDb table.

These distributed data stores often offer configurable read consistency,
allowing customers to choose eventually consistent reads
for optimal cost and performance
if stale results are acceptable for their use-case.

The current specification does not specify when agents should expect
the results of the read operations to reflect the updated state caused by mutation operations.

The current implementation utilizes eventually consistent reads in all current usage.

Consequently, a read operation will not necessarily reflect the latest results
of a mutation operation
even if performed by the same agent in a serialized manner.

This change adds the option to require consistent reads and
clarifies the required consistent read behavior for read operations.

## Detailed Explanation

The Branch Key Store's `GetActiveBranchKey`, `GetBranchKeyVersion`, and `GetBeaconKey` operations
utilize AWS DDB `GetItem` calls which
do not set the `ConsistentRead` flag.

When the `ConsistentRead` flag is unset or `false`,
DynamoDb only provides eventually consistent read guarantees.

This eventually consistent behavior is intentional
in order to optimize performance and cost.

However,
customers may have non-standard situations
which explicitly require consistent reads to be performed.

While key management operations SHOULD occur in control plane operations,
those same control plane operations MAY need to perform encryption operations.

Usage of consistent reads ensures that encryption operations
immediately following the `CreateKey` operation
will be able to find the created keys.

Similarly,
key rotation and re-encryption operations
performed due to key compromise
MAY want use consistent reads to ensure that
the encryption operations utilize the new branch key version.
For this to work local caches would need to be flushed as well.
So this may be prohibitively complicated.

However, trying to pick and chose which read operations need consistent reads
creates sharp edges in complicated customer systems.
So all operations MUST use the same configuration setting.

# Changes

The change is to introduce a new, optional `Require Consistent Reads` option
to the Branch Key Store specification.

This updates:

- The [Branch Key Store's Initialization](../../framework/branch-key-store.md#initialization)
- The [Branch Key Store's GetActiveBranchKey operation](../../framework/branch-key-store.md#getactivebranchkey)
- The [Branch Key Store's GetBranchKeyVersion operation](../../framework/branch-key-store.md#getbranchkeyversion)
- The [Branch Key Store's GetBeaconKey operation](../../framework/branch-key-store.md#getbeaconkey)

This update clarifies the existing behavior in a backwards-compatible manner
while allowing agents to opt-in to consistent reads when needed.
