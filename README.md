
# Tractor

A programming language by Jack Eisenmann

## Installation and Usage

This application has the following system-wide dependencies:

* Node.js version ^16.4
* TypeScript version ^4.3

To install this application:

1. Clone this repository on your machine.
1. Set your working directory to this repository: `cd tractor`
1. Compile TypeScript code: `tsc`

To compile a Tractor project:

```
node ./dist/compile.js <projectPath> <configName?> <configName?> <configName?>...
```

## Motivation

When creating the [WheatSystem C implementation](https://github.com/ostracod/wheatsystem-c), I wanted the codebase to be compatible with a variety of target platforms, including:

* Unix-like platforms (for debugging purposes)
* AVR microcontrollers
* PIC microcontrollers
* Microprocessors such as the 6502 and Z80

I encountered several difficulties along the way:

* C macros can't really accept macro functions as arguments. I needed to do this to define certain generic functions. I accomplished this by creating a **pre**preprocessor, but the solution was ugly.
* C macros do not have any type signature, which leads to confusion. I made an ad-hoc documentation system to annotate my macro definitions, but the solution was ugly.
* C doesn't have native support for generic types. I needed this for custom pointer types and non-volatile array data. I used my prepreprocessor to trick C into supporting generic types, but the solution was ugly.
* C is picky about the order of definitions. I was able to circumvent this problem by separating type definitions and function definitions in my build process, but the solution was ugly.
* C does not support the `typeof` construct or expression statements in the official specification. This is not a problem when using gcc, but compilers for the PIC microcontroller do not support statement expressions. I could have reworked my code to remove statement expressions, but the solution was going to be ugly.

Given all of these ugly solutions, I decided that C was not a good language for implementing WheatSystem. 

I considered using Rust as an alternative language, because it would resolve many of these problems. However, Rust cannot compile for PIC microcontrollers at this time. I imagine it would take a lot of effort to add PIC support to LLVM, as well as additional architectures I might want to use.

At this point, I decided to design a systems language which would compile into C code. The language would only need enough features to implement WheatSystem, so I could create a relatively simple specification. I named the programming language Tractor.

## Design Goals

Tractor has the following design goals:

* Easy to parse
* Rugged aesthetic
* Support for generic types
* Interchangeable import files
* Interoperability with foreign code
* Compile into C code or assembly code

## Types

Tractor has the following built-in storage types:

* `constT` is an immutable value. A variable whose type conforms to `constT` can only be assigned a value once.
* `compT` is a value which is known at compile time. `compT` is a subtype of `constT`.
* `locT` is a value which has an address in a frame or the fixed data region.
* `compLocT` is a value whose address offset in the parent region is known at compile time. `compLocT` is a subtype of `locT`. Note that `compLocT` does not imply `compT`.
* `frameT` is a value which is stored in a frame in memory. `frameT` is a subtype of `locT`. `frameT` and `compT` are mutually exclusive.
* `fixedT` is stored in the fixed data region which may be non-volatile. `fixedT` is a subtype of `compT & locT`.
* `concreteT` is a value which occupies a specific amount of space with a well-defined arrangement of bytes.
* `valueT` is a value which may occupy memory or storage. The amount of space or arrangement of bytes is unknown. `concreteT` is a subtype of `valueT`.
* `itemT` is either a value or a type. `valueT` and `typeT` are subtypes of `itemT`.

Tractor has the following built-in primitive types:

* `voidT` is a value whose size is zero.
* `uInt8T`, `uInt16T`, `uInt32T`, and `uInt64T` are unsigned integers with the given number of bits.
* `sInt8T`, `sInt16T`, `sInt32T`, and `sInt64T` are signed integers with the given number of bits.
* `int8T`, `int16T`, `int32T`, and `int64T` are integers with the given number of bits and unknown sign.
* `uIntT`, `sIntT` are integers with the given sign and unknown number of bits.
* `intT` is an integer with an unknown number of bits and unknown sign.
* `structT` is a struct with unknown fields.
* `unionT` is a union with unknown fields.
* `funcT` is a function with unknown arguments and return type.

Tractor has the following built-in parameterizable types:

* `ptrT(<type>)` is a native pointer to a value with type `<type>`. For example, `ptrT(uInt8T)` is a pointer to an unsigned 8-bit integer.
* `arrayT(<type>, <length>)` is an array of items with type `<type>` whose length is `<length>`. For example, `arrayT(uInt8T, 10)` is an array of ten unsigned 8-bit integers.
* `softArrayT(<type>)` is an array of items with type `<type>` whose length is unknown. For example, `softArrayT(uInt8T)` is an array of 8-bit integers with unknown length.
* `fieldNameT(<type>)` is the name of a field in the given struct or union type. `fieldNameT(<type>)` is a subtype of `softArrayT(uInt8T) & compT`.
* `typeT(<item>)` is the type of item `<item>`. For example, `typeT(uIntT)` is the type of an unsigned integer. `typeT` is a subtype of `compT`.

The following types are subtypes of `concreteT`:

* `uInt8T`, `uInt16T`, `uInt32T`, `uInt64T`, `sInt8T`, `sInt16T`, `sInt32T`, and `sInt64T`
* `ptrT(<type>)` for any type `<type>`
* `arrayT(<type>, <length>)` when `<type>` conforms to `concreteT`
* Any non-soft struct or union whose fields all conform to `concreteT`
* Any non-inline function handle

## Item Literals

Tractor has the following built-in primitive value literals:

* `TRUE` and `FALSE` are the boolean literals.
* `NULL` is the null pointer literal.
* A decimal integer literal consists of a sequence of decimal digits. For example, `18` is the integer 18.
* A hexadecimal integer literal begins with `0x` followed by a sequence of hexadecimal digits. For example, `0x12` is the integer 18.
* A character integer literal consists of an ASCII character enclosed by apostrophes. For example, `'A'` is the integer 65.

Tractor has the following built-in composite item literals:

* A string literal consists of a sequence of ASCII characters enclosed by quotation marks. For example, `"Hello"` is an array containing the unsigned 8-bit integers 72, 101, 108, 108, and 111.
* An array literal has the format `{<item>, <item>, <item>...}:<arrayType>`. For example, `{10, 20, 30}:softArrayT(uInt8T)` is an array containing the unsigned 8-bit integers 10, 20, and 30.
* A struct literal has the format `{<item>, <item>, <item>...}:<structType>`, where each `<item>` is a field item of the struct. For example, `{45, 60}:myStructT` is a struct of type `myStructT` whose field values are 45 and 60.

## Expressions

Tractor has the following integer operators:

* `+`, `-`, `*`, `/`, and `%` perform arithmetic operations.
* `~`, `&`, `|`, `^`, `>>`, and `<<` perform bitwise operations.
* `!`, `&&`, `||`, and `^^` perform boolean operations.
* `==`, `!=`, `>`, `>=`, `<`, and `<=` perform comparison operations.

Tractor has the following type operators:

* `~`, `&`, `|`, and `^` perform type manipulation. For example, `intT & compT` returns the type of an integer known at compile time.
* `==` and `!=` perform type comparison. For example, `uInt8T != uInt16T` returns `TRUE`.

Tractor has the following assignment operators:

* `=` performs assignment.
* `+=`, `-=`, `*=`, `/=`, and `%=` perform assignment with arithmetic manipulation.
* `&=`, `|=`, `^=`, `>>=`, and `<<=` perform assignment with bitwise manipulation.
* `&&=`, `||=`, and `^^=` perform assignment with boolean manipulation.
* `:=` performs variable initialization.

Parentheses manipulate order of operations. For example, the expression `2 * (3 + 4)` performs addition before multiplication, so the result is 14 instead of 10.

The expression `<item>:<type>` casts item `<item>` to type `<type>`. For example, the expression `10:sInt32T` returns 10 as a signed 32-bit integer.

The expression `<array>[<index>]` accesses the element in array `<array>` with index `<index>`. For example, the expression `myArray[3]` accesses the fourth value of `myArray`.

The expression `<struct>.<name>` accesses the field in struct `<struct>` with name `<name>`. For example, the expression `myStruct.x` accesses the field with name `x` in `myStruct`.

The expression `<struct>[<nameString>]` also accesses the field in struct `<struct>` with name `<nameString>`. `<nameString>` must conform to `fieldNameT(typeT(<struct>))`. For example, the expression `myStruct["x"]` accesses the field with name `x` in `myStruct`.

Function invocation has the format `<function>(<item>, <item>, <item>...)`, where each `<item>` is an argument of the invocation. For example, the expression `myFunction(10, 20)` invokes `myFunction` with argument values 10 and 20.

## Built-in Functions

Tractor has the following built-in functions:

* The parameterizable types `ptrT`, `arrayT`, `softArrayT`, `fieldNameT`, and `typeT`.
* `getSize(<type>)` returns the number of bytes which type `<type>` occupies.
* `getLen(<arrayType>)` returns the number of elements in the given array type.
* `getFieldOffset(<structType>, <nameString>)` returns the byte offset of the field with name `<nameString>` in the given struct type. `<nameString>` must conform to `fieldNameT(<structType>)`.
* `typeConforms(<type1>, <type2>)` returns whether type `<type1>` conforms to type `<type2>`.
* `newPtr(<value>)` returns a native pointer to value `<value>`. The argument value must conform to `locT`.
* `derefPtr(<pointer>)` returns the value referenced by native pointer `<pointer>`.

## Variables

Every variable has the following attributes:

* Name
* Storage class
* Constraint type
* Resolved type
* Initialization item (optional)

Variable storage class may be one of the following:

* `VAR` variables are stored in a global or local frame during runtime.
* `COMP` variables are stored during compile time, and occupy no space during runtime.
* `FIXED` variables are stored in the fixed data region. This region lies outside all frames, and may be non-volatile depending on the target platform.
* `AUTO` variables may be stored in one of several places. The storage behavior depends on the variable's initialization item.

Each storage class is associated with a type:

* `VAR` variables conform to `frameT`
* `COMP` variables conform to `compT`
* `FIXED` variables conform to `fixedT`
* `AUTO` variables may conform to `frameT`, `compT`, or `fixedT`

Variable initialization determines the first item which a variable will contain. A variable may not be initialized more than once. If a variable is not initialized, the variable will contain an undefined item.

A variable's resolved type determines the type of item which the variable may store. The resolved type is an intersection of the following types:

* The constraint type, which is provided by the variable declaration
* The type of the initialization item (if provided)
* The type of the storage class

## Statements

Every comment begins with a number sign. A comment may be placed after any statement:

```
<statement> # <comment>
```

Alternatively, a comment may be placed on its own line:

```
# <comment>
```

**Expression statement:**

```
<expression>
```

Evaluates `<expression>`, which should result in some side-effect.

**Variable statement:**

```
<storageClass> <name>, <constraintType>, <initItem?>
```

Declares a variable with storage class `<storageClass>`, name `<name>`, and constraint type `<constraintType>`. If item `<initItem>` is provided, the variable will be initialized with the given item.

Variables may be initialized using the initialization operator (`:=`) in a statement separate from declaration. For example, the following fragments of code are equivalent:

```
# Declares variable x, and initializes x with the value 123.
COMP x, uInt16T, 123
```

```
# Declares variable x.
COMP x, uInt16T
# Initializes x with the value 123.
x := 123
```

**Label statement:**

```
LABEL <name>
```

Declares a label with name `<name>` in the current function body.

**Jump statements:**

```
JUMP <name>
```

Causes program execution to skip to the label with name `<name>`.

```
JUMP_IF <name>, <condition>
```

Jumps to the label with name `<name>` if value `<condition>` is non-zero.

**Block scope statement:**

```
SCOPE
    <body>
END
```

Establishes a scope which is visible to all statements in `<body>`. Any variable declared in `<body>` will not be visible outside of the scope.

**If statement:**

```
IF <condition1>
    <body1>
ELSE_IF <condition2>
    <body2>
ELSE
    <body3>
END
```

Evaluates the statements in `<body1>` only if value `<condition1>` is non-zero. If `<condition1>` is zero but `<condition2>` is non-zero, then `<body2>` is evaluated. If both `<condition1>` and `<condition2>` are zero, then `<body3>` is evaluated. An `IF` statement may contain any number of `ELSE_IF` clauses, and the `ELSE` clause is optional.

**While statement:**

```
WHILE <condition>
    <body>
END
```

Repeats evaluation of the statements in `<body>` until expression `<condition>` evaluates to zero.

**Break and continue statements:**

```
BREAK
```

Stops evaluation of the body in the parent `WHILE` statement, causing evaluation to pass beyond the `END` statement after the body.

```
CONTINUE
```

Interrupts evaluation of the body in the parent `WHILE` statement, causing the condition of the `WHILE` statement to be evaluated again. If the condition is non-zero, the body will repeat from the beginning. If the condition is zero, evaluation will pass beyond the `END` statment after the body.

**Field statements:**

```
FIELD <name>, <type>
```

Declares a member of a struct or union with name `<name>` and type `<type>`. This statement is only valid in the body of a `STRUCT` or `UNION` statement.

```
TYPE_FIELD <name>, <type>
```

Declares an empty member of a struct or union with name `<name>` and type `<type>`. A member declared with `TYPE_FIELD` does not occupy any space, but conveys type information.

**Struct statement:**

```
STRUCT <name>
    <body>
END
```

Declares a struct with name `<name>` and the fields defined by the statements in `<body>`. The fields will be arranged in memory with the order given by `<body>`. The struct will not contain any padding between fields.

**Union statement:**

```
UNION <name>
    <body>
END
```

Declares a union with name `<name>` and the fields defined by the statements in `<body>`. The fields will be arranged in memory so that they all begin at the same position and overlap each other.

**Argument statement:**

```
ARG <name>, <type>
```

Declares an argument of a function with name `<name>`. This statement is only valid in the body of a `FUNC` or `FUNC_TYPE` statement.

* When referenced in the body of an inline function, the argument will have the same type as the item passed during invocation. The argument must conform to type `<type>`.
* When referenced in the body of a non-inline function, the argument will have type `<type> & frameT`.

**Return type statement:**

```
RET_TYPE <type>
```

Declares the return type of a function to be type `<type>`. This statement is only valid in the body of a `FUNC` or `FUNC_TYPE` statement. If `RET_TYPE` is missing in a function definition, the return type is assumed to be `voidT`.

**Return statement:**

```
RET <item?>
```

Stops evaluation of the body in the parent `FUNC` or `INIT_FUNC` statement, causing control to return to the function caller. If item `<item>` is provided, the caller will receive the given item as output of the function.

**Function type statement:**

```
FUNC_TYPE <name>
    <body>
END
```

Declares the type of a function handle with name `<name>` and signature described by `<body>`. Note that `<body>` cannot contain statements which are evaluated during runtime.

**Function statements:**

```
FUNC <name>
    <body>
END
```

Declares a function with name `<name>` and signature described by `<body>`.

When the `REQUIRE` and `FOREIGN` modifiers are absent:

* `<body>` may contain statements which are evaluated during runtime.
* If the function is non-inline, `<type>` of nested `ARG` and `RET_TYPE` statements must conform to `concreteT`.

When the `REQUIRE` or `FOREIGN` modifiers are present:

* `<body>` cannot contain statements which are evaluated during runtime.
* `<type>` of nested `ARG` and `RET_TYPE` statements may conform to `~concreteT`.

```
INIT_FUNC
    <body>
END
```

Declares the entry point function of the program with the statements in `<body>`. Each program must have exactly one entry point function. The entry point function does not accept any arguments, and has no return value.

**Import statements:**

```
IMPORT <path>
```

Imports all definitions provided by the Tractor file with path `<path>`. Note that the path `.` resolves to `projectDirectory/src`.

```
CONFIG_IMPORT <name>
```

Imports the Tractor file specified by name `<name>` in `importMap` of the target configuration.

```
FOREIGN_IMPORT <path>
```

Imports all definitions provided by the C or assembly file with path `<path>`.

## Statement Modifiers

Statement modifiers are keywords which are placed before statements.

**Require and foreign statement modifiers:**

```
REQUIRE <definition>
```

Specifies that definition `<definition>` must be declared somewhere in the current project.

```
FOREIGN <definition>
```

Specifies that definition `<definition>` has been imported using a `FOREIGN_IMPORT` statement.

When using `REQUIRE` or `FOREIGN` statement modifiers, `<definition>` must be one of the following:

* Variable statement
* `STRUCT` statement
* `UNION` statement
* `FUNC_TYPE` statement
* `FUNC` statement

**Inline statement modifiers:**

```
INLINE <function>
```

Specifies that function `<function>` will be expanded inline for each invocation. `<function>` must be a `FUNC_TYPE` or `FUNC` statement. Inline function arguments and return items are passed by reference, and may conform to `~concreteT`. However, inline function handles cannot be stored in `VAR` or `FIXED` variables, because inline function handles do not conform to `concreteT`.

```
MAYBE_INLINE <function>
```

Specifies that function `<function>` may be expanded inline for each invocation. `<function>` must be one of the following:

* `FUNC_TYPE` statement
* `REQUIRE FUNC` statement
* `FOREIGN FUNC` statement

**Soft statement modifier:**

```
SOFT <definition>
```

Specifies that definition `<definition>` may contain additional unknown fields or arguments. `<definition>` must be one of the following:

* `STRUCT` statement
* `UNION` statement
* `FUNC_TYPE` statement
* `REQUIRE FUNC` statement

## Project Structure

Every Tractor project directory must have the following structure:

```
projectDirectory/
    tractorConfig.json
    src/
        main.trtr
    build/
```

When building the project, the Tractor compiler will always include the `projectDirectory/src/main.trtr` Tractor source file. The Tractor compiler will place the build output file in the `projectDirectory/build` directory.

The `tractorConfig.json` file must conform to the following structure:

```
interface TractorConfig {
    name: string;
    description: string;
    isDefault?: boolean;
    importMap?: {[name: string]: string};
    targetLanguage?: string;
    buildFileName?: string;
    configs?: TractorConfig[];
}
```

* `importMap` determines which files to import when using the `CONFIG_IMPORT` statement.
* `targetLanguage` can only be `"unixC"` for the time being.
* `buildFileName` determines the name of the file to create in `projectDirectory/build`.
* `configs` defines nested configurations which override their parents.

## Examples

The following example prints prime numbers:

```
# This function must be defined externally.
REQUIRE FUNC printNumber
    ARG number, uInt32T
END

# Defines a function which determines whether
# the given number is prime.
FUNC isPrime
    ARG number, uInt32T
    RET_TYPE uInt8T
    
    VAR factor, uInt32T, 2
    WHILE factor < number
        IF number % factor == 0
            RET TRUE
        END
        factor += 1
    END
    RET FALSE
END

# Entry point function of the program.
INIT_FUNC
    VAR number, uInt32T, 2
    WHILE TRUE
        IF isPrime(number)
            printNumber(number)
        END
        number += 1
    END
END
```

The following example defines a custom pointer type:

```
REQUIRE FUNC printNumber
    ARG number, uInt32T
END

VAR dataRegion, arrayT(uInt8T, 100)

INLINE FUNC myPtrT
    ARG T, typeT(valueT)
    RET_TYPE typeT(valueT)
    
    STRUCT output
        FIELD offset, uInt8T
        TYPE_FIELD type, T
    END
    RET output
END

INLINE FUNC newMyPtr
    ARG offset, uInt8T
    ARG T, typeT(valueT)
    RET_TYPE myPtrT(T)
    
    RET {offset, T}:myPtrT(T)
END

INLINE FUNC readMyPtr
    ARG myPtr, myPtrT(valueT)
    RET_TYPE myPtr.type
    
    VAR tempPtr, ptrT(uInt8T), newPtr(dataRegion[myPtr.offset])
    RET derefPtr(tempPtr:ptrT(myPtr.type))
END

INLINE FUNC writeMyPtr
    ARG myPtr, myPtrT(valueT)
    ARG value, myPtr.type
    
    VAR tempPtr, ptrT(uInt8T), newPtr(dataRegion[myPtr.offset])
    derefPtr(tempPtr:ptrT(myPtr.type)) = value
END

INIT_FUNC
    VAR myPtr, myPtrT(uInt32T), newMyPtr(20, uInt32T)
    writeMyPtr(myPtr, 12345)
    VAR number, uInt32T, readMyPtr(myPtr)
    # Prints 12345.
    printNumber(number)
END
```


