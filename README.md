
# Tractor

A programming language by Jack Eisenmann

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

Tractor has the following built-in type classes:

* `constT` is an immutable value.
* `compT` is a value which is known at compile time.
* `scopeT` is a value which may be accessed anywhere in the current scope.
* `frameT` is a value which is stored in the current frame in memory. `frameT` and `compT` are mutually exclusive.
* `fixedT` is stored in the fixed data region which may be non-volatile. `fixedT` is a subtype of `constT`, `compT`, and `scopeT`.
* `anyT` is the wildcard type representing a value of any type.
* `concreteT` is a value which occupies a specific amount of space with a well-defined arrangement of bytes.

Tractor has the following built-in integer types:

* `uInt8T`, `uInt16T`, `uInt32T`, and `uInt64T` are unsigned integers with the given number of bits.
* `sInt8T`, `sInt16T`, `sInt32T`, and `sInt64T` are signed integers with the given number of bits.
* `int8T`, `int16T`, `int32T`, and `int64T` are integers with the given number of bits and unknown sign.
* `uIntT`, `sIntT` are integers with the given sign and unknown number of bits.
* `intT` is an integer with an unknown number of bits and unknown sign.

Tractor has the following built-in composite types:

* `ptrT(<type>)` is a native pointer to a value with type `<type>`. For example, `ptrT(uInt8T)` is a pointer to an unsigned 8-bit integer.
* `arrayT(<type>, <length>)` is an array of values with type `<type>` whose length is `<length>`. For example, `arrayT(uInt8T, 10)` is an array of ten unsigned 8-bit integers.
* `typeT(<type>)` is the metatype representing type `<type>`. For example, `typeT(uIntT)` is the metatype representing the type of an unsigned integer.

The following types are subtypes of `concreteT`:

* `uInt8T`, `uInt16T`, `uInt32T`, `uInt64T`, `sInt8T`, `sInt16T`, `sInt32T`, and `sInt64T`
* `ptrT(<type>)` when `<type>` conforms to `concreteT`
* `arrayT(<type>, <length>)` when `<type>` conforms to `concreteT`
* Any struct or union whose fields all conform to `concreteT`
* Any function type whose arguments and return value all conform to `concreteT`

## Value Literals

Tractor has the following built-in primitive value literals:

* `TRUE` and `FALSE` are the boolean value literals.
* `NULL` is the null pointer value literal.
* A decimal integer value literal consists of a sequence of decimal digits. For example, `18` is the integer 18.
* A hexadecimal integer value literal begins with `0x` followed by a sequence of hexadecimal digits. For example, `0x12` is the integer 18.
* A character integer value literal consists of an ASCII character enclosed by apostrophes. For example, `'A'` is the integer 65.

Tractor has the following built-in composite value literals:

* A string value literal consists of a sequence of ASCII characters enclosed by quotation marks. For example, `"Hello"` is an array containing the unsigned 8-bit integers 72, 101, 108, 108, and 111.
* An array value literal has the format `{<value>, <value>, <value>...}:<arrayType>`. For example, `{10, 20, 30}:arrayT(uInt8T, 3)` is an array containing the unsigned 8-bit integers 10, 20, and 30.
* A struct value literal has the format `{<value>, <value>, <value>...}:<structType>`, where each `<value>` is a field value of the struct. For example, `{45, 60}:myStructT` is a struct of type `myStructT` whose field values are 45 and 60.

## Expressions

Tractor has the following unary and binary operators:

* `+`, `-`, `*`, `/`, and `%` perform arithmetic operations.
* `~`, `&`, `|`, `^`, `>>`, and `<<` perform bitwise operations.
* `!`, `&&`, `||`, and `^^` perform boolean operations.
* `==`, `!=`, `>`, `>=`, `<` and `<=` perform comparison operations.
* `~`, `&`, `|`, and `^` also perform type operations. For example, `intT & compT` returns the type of an integer known at compile time.

Tractor has the following assignment operators:

* `=` performs assignment.
* `+=`, `-=`, `*=`, `/=`, `%=` perform assignment with arithmetic manipulation.
* `&=`, `|=`, `^=`, `>>=`, and `<<=` perform assignment with bitwise manipulation.
* `&&=`, `||=`, and `^^=` perform assignment with boolean manipulation.

Parentheses manipulate order of operations. For example, the expression `2 * (3 + 4)` performs addition before multiplication, so the result is 14 instead of 10.

The expression `<value>:<type>` casts value `<value>` to type `<type>`. For example, the expression `10:sInt32T` returns 10 as a signed 32-bit integer.

The expression `<array>[<index>]` accesses the element in array `<array>` with index `<index>`. For example, the expression `myArray[3]` accesses the fourth value of `myArray`.

The expression `<struct>.<name>` accesses the field in struct `<struct>` with name `<name>`. For example, the expression `myStruct.x` retrieves the field with name `x` in `myStruct`.

Function invocation has the format `<function>(<value>, <value>, <value>...)`, where each `<value>` is an argument value of the invocation. For example, the expression `myFunction(10, 20)` invokes `myFunction` with argument values 10 and 20.

The expression `AUTO` refers to a value which can be inferred from context at compile time. For example, `AUTO` in `{10, 20, 30}:arrayT(uInt8T, AUTO)` has a value of 3. Furthermore, if a function argument is excluded, its value is `AUTO`. For example, `{10, 20, 30}:arrayT(uInt8T)` is equivalent to `{10, 20, 30}:arrayT(uInt8T, AUTO)`.

## Built-in Functions

Tractor has the following built-in functions:

* The composite types `ptrT`, `arrayT`, and `typeT`.
* `getType(<value>)` returns the type of value `<value>`.
* `getSize(<type>)` returns the number of bytes which type `<type>` occupies.
* `typeConforms(<type1>, <type2>)` returns whether type `<type1>` conforms to type `<type2>`.
* `newPtr(<value>)` returns a native pointer to value `<value>`.
* `derefPtr(<pointer>)` returns the value referenced by native pointer `<pointer>`.

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

**Frame variable definition:**

```
VAR <name>, <type>, <value?>
```

Declares a variable with name `<name>` which will be stored in the global frame or current local frame. The variable will have type `<type> & frameT & scopeT`. If `<value>` is provided, the variable will be initialized with the given value.

**Compile-time variable declaration:**

```
COMP <name>, <type>, <value?>
```

Declares a variable with name `<name>` whose value is known at compile time. The variable will have type `<type> & compT & scopeT`. If `<value>` is provided, the variable will be initialized with the given value. Note that the variable is not constant unless `<type>` conforms to `constT`, so the variable may be reassigned later in the same scope. As an exception, `COMP` variables may not be reassigned in a `WHILE` loop.

**Fixed variable declaration:**

```
FIXED <name>, <type>, <value>
```

Declares a variable with name `<name>` which will be stored in the fixed data region. This region lies outside all frames, and may be non-volatile depending on the target platform. The variable will have type `<type> & fixedT`, and will be initialized with value `<value>`.

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

Declares an empty member of a struct or union  with name `<name>` and type `<type>`. A member declared with `TYPE_FIELD` does not occupy any space, but conveys type information.

**Argument statement:**

```
ARG <name>, <type>
```

Declares an argument of a function, struct, or union with name `<name>`.

* In the case of an inline function, the argument will have the same type as the value passed during invocation. The argument value must conform to type `<type>`.
* In the case of a non-inline function, the argument will have type `<type> & frameT & scopeT`.
* In the case of a struct or union, the argument will have type `<type> & compT & scopeT`.

**Struct statement:**

```
STRUCT <name?>
    <body>
END
```

Declares a struct with name `<name>` and the fields defined by the statements in `<body>`. The fields will be arranged in memory with the order given by `<body>`. The struct will not contain any padding between fields. `<name>` may be omitted if the struct is embedded in another struct or union declaration.

**Union statement:**

```
UNION <name?>
    <body>
END
```

Declares a union with name `<name>` and the fields defined by the statements in `<body>`. The fields will be arranged in memory so that they all begin at the same position and overlap each other. `<name>` may be omitted if the union is embedded in another union or struct declaration.

**Return type statement:**

```
RET_TYPE <type>
```

Declares the return type of a function to be `<type>`. This statement is only valid in the body of a `FUNC` or `FUNC_TYPE` statement.

**Return statement:**

```
RET <value?>
```

Stops evaluation of the body in the parent `FUNC` or `INIT_FUNC` statement, causing control to return to the function caller. If value `<value>` is provided, the caller will receive the given value as output of the function.

**Function type statement:**

```
FUNC_TYPE <name>
    <body>
END
```

Declares the type of a function with name `<name>` and signature described by the statements in `<body>`. Note that `FUNC_TYPE` does not define runtime behavior the function.

**Function statements:**

```
FUNC <name>
    <body>
END
```

Declares a function with name `<name>`. The statements in `<body>` describe both the signature and runtime behavior of the function.

```
INIT_FUNC
    <body>
END
```

Declares the entry point function of the program with the statements in `<body>`. Each program may only have one entry point function. The entry point function does not accept any arguments, and has no return value.

**Import statements:**

```
IMPORT <path>
```

Imports all definitions provided by the Tractor file with path `<path>`.

```
CONFIG_IMPORT <name>
```

Imports the set of Tractor files specified by name `<name>` in the target configuration.

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

When using `REQUIRE` or `FOREIGN` statement modifiers, `<definition>` must be one of the following statement types: `VAR`, `COMP`, `FIXED`, `STRUCT`, `UNION`, `FUNC_TYPE`, or `FUNC`.

* In the case of a variable statement, the variable type may conform to `~concreteT`, and the variable cannot have an initialization value.
* In the case of a struct or union statement, the field types may conform to `~concreteT`.
* In the case of a function type statement, the argument and return types may conform to `~concreteT`.
* In the case of a function statement, the argument and return types may conform to `~concreteT`, and the body cannot define runtime behavior of the function.

**Inline statement modifiers:**

```
INLINE <function>
```

Specifies that function `<function>` will be expanded inline for each invocation. `<function>` must be a `FUNC_TYPE` statement or `FUNC` statement. Inline function arguments and return values are passed by reference, and may conform to `~concreteT`. However, a handle to an inline function may not be stored in a variable.

```
MAYBE_INLINE <function>
```

Specifies that function `<function>` may be expanded inline for each invocation. `<function>` can only be a `FUNC_TYPE` statement.

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

STRUCT myPtrT
    ARG T, typeT(anyT)
    
    FIELD offset, uInt8T
    TYPE_FIELD type, T
END

INLINE FUNC newMyPtr
    ARG offset, uInt8T
    ARG T, typeT(anyT)
    RET_TYPE myPtrT(T)
    
    RET {offset, T}
END

INLINE FUNC readMyPtr
    ARG myPtr, myPtrT(anyT)
    RET_TYPE myPtr.type
    
    VAR tempPtr, ptrT(uInt8T), newPtr(dataRegion[myPtr.offset])
    RET derefPtr(tempPtr:ptrT(myPtr.type))
END

INLINE FUNC writeMyPtr
    ARG myPtr, myPtrT(anyT)
    ARG value, myPtr.type
    
    VAR tempPtr, ptrT(uInt8T), newPtr(dataRegion[myPtr.offset])
    derefPtr(tempPtr:ptrT(myPtr.type)) = value
END

INIT_FUNC
    # newMyPtr(20) is equivalent to newMyPtr(20, AUTO), which
    # is equivalent to newMyPtr(20, uInt32T) in this context.
    VAR myPtr, myPtrT(uInt32T), newMyPtr(20)
    
    writeMyPtr(myPtr, 12345)
    
    VAR number, uInt32T, readMyPtr(myPtr)
    
    # Prints 12345.
    printNumber(number)
END
```


