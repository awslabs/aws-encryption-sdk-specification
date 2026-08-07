[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# ESDK Shim Specification

## Overview

This document specifies a **shim** whose **core library** is a compliant AWS
Encryption SDK implementation (the **core ESDK**). An ESDK shim exposes the core
ESDK to a consumer running in another language or runtime (the **target**).

An ESDK shim MUST conform to the generic [Shim Specification](./shim.md). This
document defines only the ESDK-specific detail that specification defers to a
core-library-specific spec: the concrete [type translations](#type-translation),
[resources](#resources), and [operations](#operation-contracts) an ESDK shim
exposes.

A shim is not an ESDK implementation. It delegates the message format,
cryptography, key derivation, commitment, and signing to the core ESDK.

### Out of scope

Correctness of encryption, decryption, message format, key derivation,
commitment, and digital signatures is the responsibility of the core ESDK and
its own specification, and is not restated here.

## Conventions

Terms defined by the [Shim Specification](./shim.md#conventions) — shim, target,
generator, generated bindings, owned interface — are used here as defined there,
with **core ESDK** as the core library.

## Type translation

Each translation below satisfies the rules in
[Shim Specification: Type translation](./shim.md#type-translation). Operation
requirements defer to this section.

### Algorithm suite identifier

The target algorithm suite identifier is the two-byte algorithm suite ID defined
by the ESDK message format.

Converting to the core ESDK:

- The shim MUST translate a target algorithm suite identifier to the core ESDK
  algorithm suite that has the same two-byte ID.
- The shim MUST return an error when the target value is not one of the algorithm
  suite IDs defined by the core ESDK.

Converting from the core ESDK:

- The shim MUST translate a core ESDK algorithm suite to the target algorithm
  suite identifier that has the same two-byte ID.
- The shim MUST return an error when the core ESDK produces an algorithm suite
  the shim does not define.

### Commitment policy

- The shim MUST translate the target commitment policy to the core ESDK
  commitment policy of the same meaning.
- The shim MUST return an error when the target commitment policy is not a supported
  value.

### Encryption context

Converting to the core ESDK:

- The shim MUST translate the target's encryption context, given as a list of
  key-value pairs, to the core ESDK's key-value map, preserving every pair and
  the exact key and value of each.

Converting from the core ESDK:

- The shim MUST translate the core ESDK's encryption context, given as a
  key-value map, to the target's list of key-value pairs, preserving every pair
  and the exact key and value of each.

### Maximum encrypted data keys

- The target represents "no limit" as the value zero. The shim MUST translate zero
  to the core ESDK's "no limit" representation, and a positive value `n` to a
  limit of `n`.

### Frame length

- The shim MUST translate the target frame length using the core ESDK's frame
  length constructor, and MUST return an error when the core ESDK rejects the
  value.

### KMS configuration

- The shim MUST translate a KMS key ARN configuration.
- The shim MUST translate a KMS multi-Region-key ARN configuration.
- The shim MUST translate a discovery configuration.
- The shim MUST translate a multi-Region-key discovery configuration.
- The shim MUST return an error when the target KMS configuration type is not a
  supported value.

### AES wrapping algorithm

- The shim MUST translate the target AES wrapping algorithm to the core ESDK
  wrapping algorithm of the same meaning.
- The shim MUST return an error when the target wrapping algorithm is not a
  supported value.

## Resources

These are the ESDK shim's resource kinds, per
[Shim Specification: Resources](./shim.md#resources). Each is owned by the core
ESDK and referenced by the target through an owned-interface handle.

- **service client** — a client for an AWS service that a key store requires
  (for example, a KMS client or a DynamoDB client).
- **key store** — a key store, which depends on one or more service clients.
- **cache** — a cryptographic materials cache that a materials source may use to
  reuse cryptographic materials it has already obtained.
- **materials source** — a keyring or Cryptographic Materials Manager (CMM) that
  supplies cryptographic materials; a materials source may depend on a key store.

The dependency edges are therefore: a key store depends on its service clients,
and a materials source may depend on a key store and on a cache.

A materials source handle references a core-ESDK keyring or CMM.

### Service client configuration

The shim configures each AWS service client it creates from a client
configuration supplied by the target. Any value the target supplies is passed
through to the service client; where the target omits a value, the shim defers
to the core ESDK's default configuration resolution.

- The shim MUST set a user-agent on each service client of the form
  `AwsEncryptionSdk-Shim-<target-language>-<core-language>-<version>`, where
  `<target-language>` is the target language, `<core-language>` is the core
  ESDK's implementation language, and `<version>` is the shim's published version.
- The shim MUST preserve any user-agent already present in the loaded
  configuration, appending its own rather than replacing it.
- If the target supplies a retry configuration, the shim MUST apply it to each
  service client.
- If the target does not supply a retry configuration, the shim MUST defer to
  the core ESDK's default retry configuration and MUST NOT substitute its own.
- If the target supplies a region, the shim MUST apply it to each service client.
- The shim SHOULD allow one client configuration to be applied to multiple
  service clients.

## Operation contracts

Each operation below defines its required inputs and its output handling per
[Shim Specification: Operation contracts](./shim.md#operation-contracts). Except
where an input or output is passed through unmodified, each is translated per
[Type translation](#type-translation), and each operation invokes the core ESDK
per [Delegation](./shim.md#delegation).

### Client configuration

The ESDK shim MAY expose a client-level configuration mirroring the core
ESDK's client configuration, applied to every operation of that client.

- A configuration value the target supplies on both the client and a
  per-operation input MUST be rejected as invalid input.
- A configuration value the target supplies on neither the client nor the
  operation MUST defer to the core ESDK's default.

Rejecting is forward-compatible with defining override semantics later;
picking a precedence rule is not.

### Materials source

- Each of `encrypt` and `decrypt` MUST be supplied with exactly one materials
  source (see [Resources](#resources)).
- The shim MUST return an error, and MUST NOT invoke the core ESDK, when no
  materials source is supplied.

### Encrypt inputs

`encrypt`:

- MUST pass the target-supplied plaintext to the core ESDK unmodified.
- MUST provide the target-supplied encryption context to the core ESDK,
  converted as defined in [Encryption context](#encryption-context).
- MUST provide the target-supplied algorithm suite to the core ESDK,
  converted as defined in [Algorithm suite identifier](#algorithm-suite-identifier).
- MUST provide the target-supplied commitment policy to the core ESDK,
  converted as defined in [Commitment policy](#commitment-policy).
- MUST provide the target-supplied frame length to the core ESDK,
  converted as defined in [Frame length](#frame-length).
- MUST provide the target-supplied maximum-encrypted-data-keys value to
  the core ESDK, converted as defined in
  [Maximum encrypted data keys](#maximum-encrypted-data-keys).

### Encrypt outputs

`encrypt`:

- MUST return the core ESDK's ciphertext unmodified.
- MUST return the used algorithm suite, converted as defined in
  [Algorithm suite identifier](#algorithm-suite-identifier).
- MUST return the result encryption context, converted as defined in
  [Encryption context](#encryption-context).

### Decrypt inputs

`decrypt`:

- MUST pass the target-supplied ciphertext to the core ESDK unmodified.
- MUST provide the target-supplied encryption context to the core ESDK,
  converted as defined in [Encryption context](#encryption-context).
- MUST provide the target-supplied commitment policy to the core ESDK,
  converted as defined in [Commitment policy](#commitment-policy).
- MUST provide the target-supplied maximum-encrypted-data-keys value to
  the core ESDK, converted as defined in
  [Maximum encrypted data keys](#maximum-encrypted-data-keys).

### Decrypt outputs

`decrypt`:

- MUST return the core ESDK's plaintext unmodified.
- MUST return the used algorithm suite, converted as defined in
  [Algorithm suite identifier](#algorithm-suite-identifier).
- MUST return the result encryption context, converted as defined in
  [Encryption context](#encryption-context).

### Encrypt stream and decrypt stream

- The ESDK shim SHOULD provide streaming encrypt and decrypt operations,
  accepting the same inputs as [encrypt](#encrypt-inputs) and
  [decrypt](#decrypt-inputs) except the plaintext or ciphertext, which the
  target supplies incrementally.
- A successful finish step MUST return the same non-payload outputs as
  [encrypt outputs](#encrypt-outputs) or [decrypt outputs](#decrypt-outputs).
- Streamed decrypt MUST NOT release plaintext the core ESDK would not release,
  and the shim MUST surface the core ESDK's refusal to stream a message whose
  verification cannot complete until the end of the message.

### Create KMS client

- The shim MUST provide an operation that creates a KMS service client backed by
  the core ESDK.
- Creating a KMS client MUST apply the target-supplied client configuration, as
  defined in [Service client configuration](#service-client-configuration).

### Create DynamoDB client

- The shim MUST provide an operation that creates a DynamoDB service client
  backed by the core ESDK.
- Creating a DynamoDB client MUST apply the target-supplied client configuration,
  as defined in [Service client configuration](#service-client-configuration).

### Create key store

- The shim MUST provide an operation that creates a key store backed by the core
  ESDK.
- Creating a key store MUST require a KMS client handle and a DynamoDB client
  handle, checked as defined in
  [Shim Specification: Handles and lifetimes](./shim.md#handles-and-lifetimes),
  and MUST provide both to the core ESDK.
- Creating a key store MUST provide the target-supplied table name and logical key
  store name to the core ESDK.
- Creating a key store MUST provide the target-supplied KMS configuration to the
  core ESDK, converted as defined in [KMS configuration](#kms-configuration).
- Creating a key store MUST provide the target-supplied key store id and grant
  tokens to the core ESDK when present; an unset value is omitted.

### Create cache

The core ESDK defines the cache kinds. The shim expresses a cache selection by
creating a cache of that kind, so a kind the core ESDK does not define cannot be
requested.

- The shim MUST provide an operation that creates a cache that performs no
  caching, backed by the core ESDK.
- The shim MUST provide an operation that creates a multi-threaded cache backed
  by the core ESDK.
- Creating a multi-threaded cache MUST provide the target-supplied entry
  capacity and entry pruning tail size to the core ESDK when present; an unset
  value is omitted, deferring to the core ESDK's default.

### Create hierarchical keyring

- The shim MUST provide an operation that creates a hierarchical keyring backed
  by the core ESDK.
- Creating a hierarchical keyring MUST require a key store handle, checked as
  defined in
  [Shim Specification: Handles and lifetimes](./shim.md#handles-and-lifetimes),
  and MUST provide it to the core ESDK.
- Creating a hierarchical keyring MUST provide the target-supplied branch key id
  and time-to-live to the core ESDK.
- Creating a hierarchical keyring MAY be supplied with a cache handle (see
  [Resources](#resources)).
- When a cache handle is supplied, creating a hierarchical keyring MUST provide
  the referenced cache to the core ESDK.
- When no cache handle is supplied, creating a hierarchical keyring MUST defer
  to the core ESDK's default cache.
- Creating a hierarchical keyring MUST provide the target-supplied partition id to
  the core ESDK when present; an unset value is omitted.

### Create raw AES keyring

- The shim MUST provide an operation that creates a raw AES keyring backed by
  the core ESDK.
- Creating a raw AES keyring MUST provide the target-supplied key namespace and
  key name to the core ESDK.
- Creating a raw AES keyring MUST pass the target-supplied wrapping key to the
  core ESDK unmodified.
- Creating a raw AES keyring MUST provide the target-supplied wrapping algorithm
  to the core ESDK, converted as defined in
  [AES wrapping algorithm](#aes-wrapping-algorithm).

## Conformance and testing

In addition to the [Shim Specification conformance requirements](./shim.md#conformance-and-testing):

- The ESDK shim MUST be tested for the behavior it owns — translation, handle
  validation, error propagation, and lifetime safety — rather than by re-testing
  the core ESDK's cryptographic behavior.
- The ESDK shim SHOULD demonstrate message interoperability with other ESDK
  implementations (for example via a shared test-vector suite).
