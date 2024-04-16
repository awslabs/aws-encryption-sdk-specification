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
The framework constructs this set of pairings
to be representative of all possible
input configurations and expected results.
As a result, executing all enumerated pairings' input configurations
and receiving the pairing's expected result
is representative of all possible input and output configurations.

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

### Enumerating input configurations

One test vector input configuration can be constructed by selecting one possible value (or possible [representative value](test-vector-enumeration.md#selecting-a-representative-input-value)) from all relevant [input dimensions](test-vector-enumeration.md#input-dimensions).

All test vector input configurations can be enumerated by constructing all unique input configurations.

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
and the test manifest generator should implement this.

These rules can be relatively informal in the spec,
but ideally should be written programmatically,
so a developer can write implement these rules in test manifest generation code.

Evaluation rules are a useful abstraction to determine a given test scenario's expected result. A list of independent rules is flexible and maintainable. A list of rules that maintain the same interface (reads input configuration; outputs success/fail) makes evaluating these rules programmable.

### Multiple errors (TODO)

An input configuration SHOULD only be deterministic of a single error.
If a single input configuration can result in multiple errors,
it SHOULD NOT be written.
For example,
if a test scenario specifies that `decrypt` provides incorrect `reproducedEncryptionContext` to a requried encryption context CMM
but also specifies a key that cannot decrypt the encrypted value,
that scenario should not be specified.

(Is the above accurate?
Do we need some method to determine precedence of errors?
ex. if the decrypt key is wrong, but the reproduced EC is also wrong,
should that be allowed and we should just pick the first error?)