# エラーのある図

```{.tikz #fig:broken caption="壊れた図"}
\begin{tikzpicture}
  \draw (0,0) -- (1,1);
  \undefinedmacro
  \draw (0,0) -- (1,0);
\end{tikzpicture}
```

```tikz
\begin{tikzpicture}
  \draw (0,0) -- (1,1)
\end{tikzpicture}
```
