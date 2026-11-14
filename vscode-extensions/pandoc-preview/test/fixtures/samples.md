# 自作サンプル

実際の文書でよく使う構造を真似た図．
caption にインラインコードを書く図は `~~~` のフェンスにする（`` ``` `` の情報文字列にはバッククォートを書けない）．

~~~{.tikz #fig:multiplet caption="多重項の成分と変換の関係（和文ノード，`align=center` での改行）．"}
\begin{tikzpicture}[>=Stealth, node distance=10mm]
  \node[draw, rounded corners, minimum width=28mm, minimum height=10mm] (a) {スカラー $\phi$};
  \node[draw, rounded corners, minimum width=28mm, minimum height=10mm, right=of a] (b) {スピノル $\psi_\alpha$};
  \node[draw, rounded corners, minimum width=28mm, minimum height=10mm, right=of b] (c) {補助場 $F$};
  \draw[->, bend left=18] (a) to node[above] {$Q$} (b);
  \draw[->, bend left=18] (b) to node[below] {$\bar Q$} (a);
  \draw[->, bend left=18] (b) to node[above] {$Q$} (c);
  \draw[->, bend left=18] (c) to node[below] {$\bar Q$} (b);
  \node[below=10mm of b, align=center] {殻外では $2+4+2$ 自由度\\殻上では $2+2$ 自由度};
\end{tikzpicture}
~~~

```{.tikz #fig:bound caption="質量 $m$ と中心電荷 $|Z|$ の関係"}
\begin{tikzpicture}[x=0.9cm, y=0.6cm, >=Stealth]
  \fill[gray!25] (0,0) -- (5.5,5.5) -- (5.5,0) -- cycle;
  \draw[->] (0,0) -- (6.2,0) node[right] {$|Z|$};
  \draw[->] (0,0) -- (0,6.2) node[above] {$m$};
  \draw[thick] (0,0) -- (5.5,5.5) node[above right] {$m=|Z|$};
  \node[align=center] at (4.2,1.6) {許されない領域};
  \fill (3.5,3.5) circle (2pt) node[above left] {BPS 状態};
\end{tikzpicture}
```

```{.tikz #fig:plot caption="pgfplots によるグラフ"}
\begin{tikzpicture}
  \begin{axis}[width=7cm, height=5cm, xlabel={$x$}, ylabel={$V(x)$}, domain=-2:2, samples=60]
    \addplot[thick, blue] {x^4 - 2*x^2};
  \end{axis}
\end{tikzpicture}
```

```{.tikz #fig:feyn caption="tikz-feynhand による Feynman 図"}
\begin{tikzpicture}
  \begin{feynhand}
    \vertex (a) at (-2,1) {$e^-$};
    \vertex (b) at (-2,-1) {$e^+$};
    \vertex [dot] (c) at (-0.8,0) {};
    \vertex [dot] (d) at (0.8,0) {};
    \vertex (e) at (2,1) {$\mu^-$};
    \vertex (f) at (2,-1) {$\mu^+$};
    \propag [fer] (a) to (c);
    \propag [antfer] (b) to (c);
    \propag [pho] (c) to [edge label=$\gamma$] (d);
    \propag [fer] (d) to (e);
    \propag [antfer] (d) to (f);
  \end{feynhand}
\end{tikzpicture}
```

```{.tikz #fig:brace caption="decorations と calc"}
\begin{tikzpicture}
  \foreach \i in {0,...,4} \draw (\i,0) circle (0.3) node {$\i$};
  \draw[decorate, decoration={brace, amplitude=6pt}] (-0.3,0.5) -- (4.3,0.5)
    node[midway, above=6pt] {$N$ 枚の D-brane};
  \draw[decoration={snake, amplitude=1mm}, decorate, red] ($(0,-0.3)+(0,-0.3)$) -- ($(4,-0.3)+(0,-0.3)$);
\end{tikzpicture}
```

```{.tikz #fig:braid caption="braids"}
\begin{tikzpicture}
  \braid[number of strands=3] s_1 s_2^{-1} s_1;
\end{tikzpicture}
```

```{.tikz #fig:xy caption="xy-pic"}
\xymatrix{ A \ar[r]^f \ar[d]_g & B \ar[d]^h \\ C \ar[r]_k & D }
```
