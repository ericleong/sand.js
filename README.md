![sand.js logo](/icon/launcher_icon.png?raw=true "the pyramids?")

sand.js
=======

A [falling sand game](http://en.wikipedia.org/wiki/Falling-sand_game) as a [cellular automaton](http://en.wikipedia.org/wiki/Cellular_automaton), in WebGL.

Visit [ericleong.github.io/sand.js](http://ericleong.github.io/sand.js/) for a demo.

## playing locally

Open `index.html` in a browser of your choice after downloading this repository.

## configs

New cells and rules can be defined in a space-delimited text file. The format is based off of mods for [wxSand](http://www.piettes.com/fallingsandgame/).

### cells

A cell is a single element in the game. Every pixel in the sandbox should correspond to a cell, unexpected behavior may occur otherwise. A cell is defined by 

```
cell <name> <red> <green> <blue> <density>
```

Valid color values are integers from `0` to `255`, and valid density values range from `0.0` to `1.0` (in practice, it is still mapped to an 8-bit integer, so precision is not infinite). *Note that densities of zero may behave unexpectedly!* Names cannot have spaces. Here is an example:

```
cell empty 0 0 0 0.5
```

_empty_ is the default background, and is black with a density of `0.5`. Cells with higher densities will fall, and cells with lower densities will float. Here is one possible way to write sand: 

```
cell sand 255 255 255 1.0
```

Note that there is a limit of 256 cell types, and all names must be unique. Due to implementation details, cells cannot have colors too similar to other cells - a good rule of thumb is one color channel must be at least 4 (3 bits) away from the nearest cell. For example, `255 0 0` and `253 0 0` are too close together, but `255 0 0` and `251 0 0` are just far enough apart. In other words, if your eyes can't tell the difference, they're probably too similar.

### rules

Rules govern the interactions between cells. They are defined like this:

```
rule <current cell> <neighboring cell> <new current cell> <new neighboring cell>
```

Obviously, each cell has many neighbors, only the one with the highest priority is chosen. This decision is based on density: if a cell with a density of `1.0` is surrounded by other cells with a density of `0.5`, the cell immediately below it is chosen and the game looks up the rule for each of them. Cells are only compared with cells that are directly adjacent, including diagonally. For example, for falling `sand` (using the definitions above):

```
rule empty sand sand empty
```

When an `empty` cell is below a `sand` cell, it becomes a `sand` cell, and the `sand` cell becomes an `empty` cell. This simulates falling at the cell level.

A cell that does not interact with `empty` (and therefore does not move) can be defined as:

```
rule wall empty wall empty
```

More complex interactions can be simulated by creating new cells, rather than simply swapping them. For example:

```
rule fire sand fire fire
```

This causes `fire` to spread in the presence of sand. Note that it will only spread in the direction governed by its density. 
You can also create entirely different cells, like this:

```
rule fire sand smoke fire
```

Just make sure to put out the fire!

Note that if there is more than one rule for a pair of cells, the only the last one is considered.

---

# how it works

Falling sand games tend to work by operating on a single pixel and swapping it with neighboring cells. First, the cell below is checked:

| &#x2002; | &#x2002; | &#x2002; |
|---|---|---|
| &#x2002; | &#x25CF; | &#x2002; |
| &#x2002; | &#x2193; | &#x2002; |

and then the cells on the left and right:

| &#x2002; | &#x2002; | &#x2002; |
|---|---|---|
| &#x2002; | &#x25CF; | &#x2002; |
| &#x2199; | &#x2002; | &#x2198; |

Moved cells are marked so that they are not moved more than once a frame.

Most falling sand games are written for the CPU and modify the sandbox (the rectangular region with all the cells) in place. Unfortunately this method is not very parallelizable, especially for GPUs.

## cellular automata

Falling sand games can be modeled as cellular automata, with two states, `occupied` and `unoccupied`, but the usual approaches (like the above) are asynchronous, since they modify the global state one cell at a time. The difficulty of a synchronous approach is the conservation of cells:

| &#x2198; | &#x2002; | &#x2199; |
|---|---|---|
| &#x2002; | &#x25CF; | &#x2002; |

Two cells may contend for the same cell at the same time, and this may result in one cell disappearing. This can be mitigated by having cells always choose to fall _left_ (if they can't fall downward). So the rules could be

1. `occupied` cell
  1. if _below_ is unoccupied, become unoccupied
  2. if _below left_ is unoccupied, become unoccupied
2. `unoccupied` cell
  1. if _above_ is occupied, become occupied
  2. if _above right_ is occupied, become occupied

Yet this is not enough. Consider this case:

| &#x25CB; | &#x25CF; |
|---|---|
| &#x2199; | &#x25CB; |

The cell with the black circle shoud not fall to the lower left because it is blocked by the cell to the left, and the empty cell will become occupied because of the cell above it.

sand.js checks this and similar cases to conserve cells.

## density

In the above case, different things happen if a cell is `occupied` or `unoccupied`. For a cellular automaton with two states, this is fine, but if we want to add more states, we need a more general method for deciding if two cells should swap.

One solution is to attach an additional parameter to each pixel: density. First compares the current cell's density to the cell below it. If it is higher, then a swap occurs, if not, it checks the cell above. This is useful becauase it conserves cells - the cell below will notice that it should swap with the cell above, and cells are conserved.

### density stacking

Occasionally, cells may stack so that a cell needs to swap with both the one above it and the one below it:

| 2 |
|---|
| 1 |
| 0 |

This situation is impossible to resolve by only looking at the local neighborhood using a synchronous approach, if we swap `0` and `1` at the same time as `1` and `2`, we could end up in one of two situations:

| a | b |
|---|---|
| 1 | 1 |
| 2 | 0 |
| 1 | 1 |

Obviously, cells are not conserved in either case. It may seem like a good idea to swap `0` and `2`, but this simply hides the problem by expanding the neighborhood, and the obvious next case is layering 4 cells deep. Another solution is to simply not do one of the swaps, thus requiring three iterations to solve the situation:

| #0| #1| #2| #3|
|---|---|---|---|
| 2 | 1 | 1 | 0 |
| 1 | 2 | 0 | 1 |
| 0 | 0 | 2 | 2 |

Unfortunately this requires the bottom cell to know the density of the top cell, but it is a worthwhile tradeoff to conserve cells. Also, if the center cell and the top cell don't actually swap (possibly specified in the rules), this solution also fails.

---

# implementation

Cells are implemented as pixels on a webgl texture. The data is laid out like this:

| red | green | blue | alpha |
|---|---|---|---|
| cell index | _unused_ | _unused_ | density |

The `cell index` is dynamically generated when loading the config - it generally follows the order in the config, unless there are duplicates. When drawing the sand to the screen a `256x1` lookup table is used to determine the color. For example, the basic `empty` and `sand` case has a index lookup table like:

| index | color |
|---|---|
| 0 | black |
| 1 | amber |

Rules are implemented using another texture table. Once it is determined that two cells are interacting, the rules are queried to determine the result. The indices for the two interacting cells are used as coordinates in the rules table, a `256x256` texture. The table tells the current cell what cell to become.

For example, if `0` (empty) is the current cell and it is interacting with a `1` (sand) cell, then we go to `(0, 1)` in the rules table:

| index | 0 | 1 |
|---|---|---|
| 0 | `0` | `1` |
| 1 | `0` | `1` |

which states that the current cell must now be `1`, or `sand`. Each rule in the _config_ file corresponds to two entries in the rules table. There is a limit of 256 cell types, which would require 32768 rules.
