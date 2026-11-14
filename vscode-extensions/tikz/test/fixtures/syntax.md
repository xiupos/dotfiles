# TikZ の記法

[@fig:circle] は属性形式，[@fig:cd] は div 形式の図である．
[@fig:nocap] はキャプションのない番号付きの図である．

```{.tikz #fig:circle caption="半径 $r$ の円．$α$ は **Unicode** で書いた角度"}
\begin{tikzpicture}
  \draw (0,0) circle (1);
  \draw[->] (0,0) -- node[above] {$r$} (1,0);
  \draw (0.4,0) arc (0:40:0.4) node[right, xshift=1pt, yshift=-1pt] {$\alpha$};
  \draw (0,0) -- (40:1);
\end{tikzpicture}
```

::: {#fig:cd}
```tikz
\begin{tikzcd}
  A \arrow[r, "f"] \arrow[d, "g"'] & B \arrow[d, "h"] \\
  C \arrow[r, "k"'] & D
\end{tikzcd}
```

可換図式．$h \circ f = k \circ g$ が成り立つ．**強調**も書ける．

2段落目のキャプション．
:::

```{.tikz #fig:nocap}
\begin{tikzpicture}
  \fill[blue!30] (0,0) rectangle (2,1);
  \node at (1,0.5) {番号だけ};
\end{tikzpicture}
```

従来どおりの，ラベルもキャプションもない図：

```tikz
\begin{tikzpicture}
  \draw[thick, red] (0,0) -- (2,1) -- (3,0);
\end{tikzpicture}
```

関係のない div はそのまま：

::: {.proof}
これは証明である．
:::
