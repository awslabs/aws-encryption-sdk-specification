[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

## Summary

For each type of key or cmm description,
there is a file that describes how this component is tested.
This simplifies reasoning about each component.
To find out how the DefaultCMM is tested
look at the default-cmm.md file
that describes how this component is tested
and the various features that can be reasoned about.

The test vectors MUST aggregate all these individual tests together
into larger manifest files.

Unless otherwise specified, all "Basic Tests" MUST use a `DefaultCMM`

## Motivation

By keeping every component separate is is easier to find
and reason about the completeness of testing.
This also allows top level clients like the ESDK or DBESDK to
reuse the key or cmm description to avoid reinventing the wheel.
