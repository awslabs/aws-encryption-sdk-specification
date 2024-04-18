[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Test Vector Enumeration 

## Overview

Test vectors are a suite of known value tests.
Successfully running test vectors asserts that
given some set of input configurations to encrypt and/or decrypt,
when these configurations are encrypted and/or decrypted,
then the expected result is achieved on encrypt and/or decrypt.

This document outlines a framework
to enumerate a set of pairings
of input configurations to encryption and/or decryption
and expected results of encryption and/or decryption.

The framework does not enumerate
every possible input configuration for two reasons:
1. It is impractical to enumerate every possible input value 
for some attributes in an input configuration
(see ["representative values"](#selecting-a-representative-input-value)).
2. Some input configurations with `negative` expected results
are not as critical of test cases as others
and are not a priority to test at this time
(see ["filtering input configurations"](#filtering-input-configurations))

As a result,
the framework does not actually enumerate
all possible input configurations and expected results.
However, by carefully reasoning about
the selection of representative values
and the filtered test cases,
the framework constructs a set of pairings
that is *representative* of all *relevant*
input configurations and expected results.

## Input configuration

An input configuration is a list of key-value pairs
where the key represents some [input dimension](#input-dimensions)
and the value is one allowed value in that input dimension.

### Input dimensions

An input dimension describes the range of possible values
an attribute of the [input configuration](#input-configuration) can take on.

For example, the input dimension for `"algorithmSuiteId"`
in the ESDK can take on any of the [supported algorithm suite values](../algorithm-suites.md#supported-algorithm-suites-enum).

The spec for an input dimension SHOULD define
its range of possible values
or how to construct its range of possible values.

### Selecting a representative input value

Not every input value in an [input dimension](#input-dimensions) can be practically tested, 
as the number of allowed configurations as inputs to encryption is massive.
For example, the number of possible plaintexts that can be encrypted is massive;
it is impractical to enumerate and test all possible plaintexts.

In cases where there are too many inputs to enumerate and test,
we instead test "representative" values.

To select representative values,
we first partition the set of all possible inputs
into smaller sets,
where all members of a smaller set share some characteristic of interest.
Then, we choose a concrete "representative" value of the smaller set,
and test it in the test vectors.

For example, we might partition the set of all possible plaintexts
based on the plaintext length.
Our hypothetical "smaller sets" might be:
* Empty: length = 0
* Small: all plaintexts where (1 < length ≤ 10)
* Medium: all plaintexts where (10 < length ≤ 1000)
* Large: all plaintexts where (1000 < length ≤ 2^32-1)
* Largest frame: all plaintexts where (length = 2^32-1)
* Largest frame + partial frame: all plaintexts where (length = 2^32-1 + [1 .. 2^32-1))
* Two largest frames: all plaintexts where (length = 2*(2^32-1))
* Many frames: all plaintexts where (length = 2*(2^32-1) + [1 .. (2^32-1)*(2^32-3)])

(The motivation for partitioning this set based on lengths of 2^32-1 comes from the ESDK message [frame size](https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/message-format.html#body-framing).)

From each of these smaller sets, we select one (or more) 
concrete "representative" values that are tested in test vectors.
For example, a representative "small" plaintext could be `"abc"`.

This framework of representative values
reduces any impractically large set of test inputs
to a practically testable size
while maintaining reasonable test coverage.
Its specification here documents reasoning for this framework
for readers or users of a test vector library
to understand the motivation for this concept.

### Modifying representative values

It is expected that a representative value could be modified
within its constraints
without loss in test coverage.

For example,
given a representative small plaintext of `"abc"`,
if one were to change this to `"wxyz"`,
this should have no impact on test coverage.
This is still a small plaintext
according to the constraints on small plaintexts
and should be an allowed change.

On the other hand,
given a representative small plaintext of `"abc"`,
if one were to change this to `""`,
this removes coverage for small plaintexts.
This violates the constraint for small plaintexts
and should not be an allowed change.

The property that a representative value may be modified within its constraints
acts as an assertion that the representative value is not special,
and is truly "representative" of other values in its constrained set.

### Filtering input configurations

Input configurations may be "filtered"
and not be tested.

This is a mechanism to identify test cases that
may not be as important as others
and avoid writing them to a test vector manifest.

#### Motivation

Some input configurations produced as a result of the enumeration above
will not be tested
as they are not important enough
to warrant the time spent testing them.

For example,
consider all cases where a hierarchical keyring is encrypting,
but some raw AES key is decrypting.
This is expected have an [expected result](#expected-results) of `negative-decrypt`,
since a hierarchical keyring's encrypt result is incompatible with AES decryption.
This may be worth validating once with test vectors to ensure this scenario
fails with the expected result.

However, consider that the enumeration process above
would result in a large number of test scenarios
with an encrypting hierarchical keyring and a decrypting raw AES key,
but with many combinations of [input dimension](#input-dimensions) values.
(Consider that a scenario will be written with every combination of [representative plaintext length](esdk-test-vector-enumeration.md#representative-plaintext-constraints),
every [commitment policy](../../client-apis/client.md#commitment-policy), every [algorithm suite ID](../algorithm-suites.md#algorithm-suite-id), etc.)
In each case, the expected result is still `negative-decrypt`,
but the test manifest now has a large number of test scenarios
that fail for the same reason.

Testing that hierarchical keyring-encrypted messages
cannot be decrypted by raw AES keyrings
across all possible input configurations
is simply not as important
as testing one of these input configurations.

Another motivation for filtering test vectors
comes from their usage as a code testing tool.
Developers run test vectors against their code changes
to ensure their changes
do not break interoperability with other libraries.
These tests should finish in a reasonable amount of time, and
running unimportant tests wastes time.

As a result of these considerations,
determining which enumerated input configurations
should be tested
becomes a matter of priorities
for a library developer.
This spec explicitly does not define
what an "important" test case is,
nor set a standard for how long test vectors should take to execute.
Test vector manifest generation library authors
should determine which input configurations are "important"
and determine a reasonable execution duration for these tests.

#### Guidance

Some guidance for filtering input configurations:

* Prune invalid configurations as early as possible.
Input configurations can be filtered at any point in the vector enumeration process,
though it is beneficial to filter as early as possible
and prune large numbers of filtered configurations
to make input configuration enumeration as fast as possible.
For example, if the configuration under consideration
has a hierarchy keyring on encrypt and a raw AES keyring on decrypt,
the manifest generator might generate only one of these cases
(as a smoke test),
then skip considering all other configurations.
In contrast, a naïve approach would consider all of these other configurations
and deem them invalid.
This guidance suggests short-circuiting that evaluation as much as possible
to save time when generating vectors.

### Enumerating input configurations

One test vector input configuration can be constructed by selecting one possible value (or possible [representative value](test-vector-enumeration.md#selecting-a-representative-input-value)) from all relevant [input dimensions](test-vector-enumeration.md#input-dimensions).

All test vector input configurations can be enumerated by constructing all unique input configurations.
If a test should be [filtered](#filtering-input-configurations), it should not be enumerated.

## Expected results

An expected result is a categorical value
and an optional error description.

An expected result categorical value is one of:
* Positive (successful test scenario)
    * `"positive-keyring"`
* Negative encrypt (failure on encrypt)
    * `"negative-encrypt-keyring"`
* Negative decrypt (failure on decrypt)
    * `"negative-decrypt-keyring"`

The error description for negative scenarios
describes the reason for the scenario's failure.

### Determining expected results

In contrast to [input configuration enumeration](#enumerating-input-configurations),
which is a constructive multiplicative process,
the expected result of a test
is deterministic from the input configuration.

The expected result of an [input configuration](#input-configuration) can be determined
by evaluating all relevant [evaluation rules](#expected-result-evaluation-rules) for that input configuration.
If no evaluation rules fail, the test scenario result should be `"positive-keyring"`.
If one evaluation rule fails, the test scenario result should be the result of that evaluation rule.
If multiple evaluation rules fail, the test scenario should not be written. See [below](#multiple-errors-todo).

#### Expected result evaluation rules

An evaluation rule reads the input configuration [input configuration](#input-configuration),
and determines whether the configuration is valid
under the conditions the rule evaluates.

For example,
the [required encryption context CMM component](complete-vectors/required-encryption-context-cmm.md#required-encryption-context-cmm-failures-on-encrypt)
defines the conditions for encryption to fail.
This can be interpreted as an evaluation rule,
and the test manifest generator should implement this
when generating test vectors using the required encryption context CMM
to determine when these vectors should fail.

These rules can be relatively informal in the spec,
but ideally should be written programmatically,
so a developer can write implement these rules in test manifest generation code.

Evaluation rules are a useful abstraction to determine a given test scenario's expected result.
A list of independent rules is flexible and maintainable.
A list of rules that maintain the same interface
(reads input configuration; outputs success/fail)
makes evaluating these rules programmable.
