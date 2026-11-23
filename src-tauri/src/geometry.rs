//! Dónde va la ventana flotante. Todo en píxeles físicos y sobre la píldora visible,
//! sin el margen transparente de la ventana.

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Edge {
    Left,
    Right,
    Top,
    Bottom,
}

/// Área de trabajo de un monitor: sin paneles ni barra de tareas.
#[derive(Clone, Copy, Debug)]
pub struct Area {
    pub rect: Rect,
    pub scale: f64,
}

impl Area {
    /// Píxeles físicos de una medida lógica en este monitor.
    pub fn px(&self, logical: f64) -> i32 {
        (logical * self.scale).round() as i32
    }
}

impl Rect {
    pub fn new(x: i32, y: i32, width: i32, height: i32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }

    fn right(&self) -> i32 {
        self.x + self.width
    }

    fn bottom(&self) -> i32 {
        self.y + self.height
    }

    fn overlap(&self, other: &Rect) -> i64 {
        let width = self.right().min(other.right()) - self.x.max(other.x);
        let height = self.bottom().min(other.bottom()) - self.y.max(other.y);
        i64::from(width.max(0)) * i64::from(height.max(0))
    }

    /// Lo mueve lo justo para que quepa en `area`, dejando `gap` alrededor.
    fn fit(self, area: &Rect, gap: i32) -> Rect {
        // Si no cabe, manda el borde izquierdo o superior.
        let x = self
            .x
            .min(area.right() - gap - self.width)
            .max(area.x + gap);
        let y = self
            .y
            .min(area.bottom() - gap - self.height)
            .max(area.y + gap);
        Rect { x, y, ..self }
    }

    /// Lo pega a un borde, a `gap` de distancia.
    pub fn dock(self, area: &Rect, edge: Edge, gap: i32) -> Rect {
        let mut docked = self;
        match edge {
            Edge::Left => docked.x = area.x + gap,
            Edge::Right => docked.x = area.right() - gap - self.width,
            Edge::Top => docked.y = area.y + gap,
            Edge::Bottom => docked.y = area.bottom() - gap - self.height,
        }
        docked.fit(area, gap)
    }

    /// Borde al que se pega al soltarlo aquí, si está a `reach` o menos (o lo pasa).
    pub fn edge_within(&self, area: &Rect, reach: i32) -> Option<Edge> {
        [
            (Edge::Left, self.x - area.x),
            (Edge::Right, area.right() - self.right()),
            (Edge::Top, self.y - area.y),
            (Edge::Bottom, area.bottom() - self.bottom()),
        ]
        .into_iter()
        .filter(|(_, distance)| *distance <= reach)
        .min_by_key(|(_, distance)| *distance)
        .map(|(edge, _)| edge)
    }

    /// Cambia de tamaño sin mover el lado más cercano al borde.
    pub fn resize(self, width: i32, height: i32, area: &Rect, edge: Option<Edge>) -> Rect {
        let keep_right = match edge {
            Some(Edge::Left) => false,
            Some(Edge::Right) => true,
            _ => area.right() - self.right() < self.x - area.x,
        };
        let keep_bottom = match edge {
            Some(Edge::Top) => false,
            Some(Edge::Bottom) => true,
            _ => area.bottom() - self.bottom() < self.y - area.y,
        };
        Rect {
            x: if keep_right {
                self.right() - width
            } else {
                self.x
            },
            y: if keep_bottom {
                self.bottom() - height
            } else {
                self.y
            },
            width,
            height,
        }
    }

    /// Como `resize`, y además dentro del área y pegado a su borde si lo tenía.
    pub fn resize_in(
        self,
        width: i32,
        height: i32,
        area: &Rect,
        edge: Option<Edge>,
        gap: i32,
    ) -> Rect {
        let resized = self.resize(width, height, area, edge);
        match edge {
            Some(edge) => resized.dock(area, edge, gap),
            None => resized.fit(area, gap),
        }
    }
}

/// Monitor en el que está la mayor parte del rectángulo.
pub fn area_of<'a>(rect: &Rect, areas: &'a [Area]) -> Option<&'a Area> {
    areas
        .iter()
        .map(|area| (area, rect.overlap(&area.rect)))
        .filter(|(_, overlap)| *overlap > 0)
        .max_by_key(|(_, overlap)| *overlap)
        .map(|(area, _)| area)
}

/// Arriba a la derecha.
pub fn initial(width: i32, height: i32, area: &Rect, margin: i32) -> Rect {
    Rect::new(
        area.right() - margin - width,
        area.y + margin,
        width,
        height,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    const GAP: i32 = 12;
    const REACH: i32 = 16;
    /// Dos monitores contiguos, como los de un portátil con pantalla externa.
    const LEFT: Rect = Rect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    };
    const RIGHT: Rect = Rect {
        x: 1920,
        y: 0,
        width: 1920,
        height: 1156,
    };

    fn areas() -> [Area; 2] {
        [LEFT, RIGHT].map(|rect| Area { rect, scale: 1.0 })
    }

    fn pill(x: i32, y: i32) -> Rect {
        Rect::new(x, y, 212, 78)
    }

    #[test]
    fn empieza_arriba_a_la_derecha() {
        assert_eq!(initial(212, 78, &RIGHT, 24), pill(3840 - 24 - 212, 24));
    }

    #[test]
    fn la_posicion_inicial_no_toca_ningun_borde() {
        assert_eq!(
            initial(212, 78, &RIGHT, 24).edge_within(&RIGHT, REACH),
            None
        );
    }

    #[test]
    fn se_pega_a_los_cuatro_bordes() {
        let cases = [
            (pill(16, 500), Edge::Left, pill(12, 500)),
            (pill(1920 - 212 - 16, 500), Edge::Right, pill(1696, 500)),
            (pill(800, 16), Edge::Top, pill(800, 12)),
            (pill(800, 1080 - 78 - 16), Edge::Bottom, pill(800, 990)),
        ];
        for (dropped, edge, docked) in cases {
            assert_eq!(dropped.edge_within(&LEFT, REACH), Some(edge));
            assert_eq!(dropped.dock(&LEFT, edge, GAP), docked);
        }
    }

    #[test]
    fn un_pixel_mas_lejos_queda_suelta() {
        assert_eq!(pill(17, 500).edge_within(&LEFT, REACH), None);
        assert_eq!(pill(1920 - 212 - 17, 500).edge_within(&LEFT, REACH), None);
    }

    #[test]
    fn pasada_del_borde_vuelve_dentro() {
        let dropped = pill(-150, 1060);
        assert_eq!(dropped.edge_within(&LEFT, REACH), Some(Edge::Left));
        assert_eq!(dropped.dock(&LEFT, Edge::Left, GAP), pill(12, 990));
    }

    #[test]
    fn en_una_esquina_manda_el_borde_mas_cercano() {
        assert_eq!(pill(10, 4).edge_within(&LEFT, REACH), Some(Edge::Top));
        assert_eq!(pill(4, 10).edge_within(&LEFT, REACH), Some(Edge::Left));
    }

    #[test]
    fn el_borde_compartido_es_el_del_monitor_donde_esta_casi_toda() {
        let areas = areas();
        let mostly_left = pill(1800, 300);
        assert_eq!(area_of(&mostly_left, &areas).unwrap().rect, LEFT);
        assert_eq!(mostly_left.edge_within(&LEFT, REACH), Some(Edge::Right));

        let mostly_right = pill(1850, 300);
        assert_eq!(area_of(&mostly_right, &areas).unwrap().rect, RIGHT);
        assert_eq!(mostly_right.edge_within(&RIGHT, REACH), Some(Edge::Left));
    }

    #[test]
    fn fuera_de_todos_los_monitores_no_hay_area() {
        assert!(area_of(&pill(5000, 300), &areas()).is_none());
        assert!(area_of(&pill(-212, 300), &areas()).is_none());
    }

    #[test]
    fn crece_desde_el_lado_mas_cercano() {
        // Arriba a la derecha: quietos el borde derecho y el superior.
        let top_right = pill(1600, 100).resize(340, 70, &LEFT, None);
        assert_eq!(top_right, Rect::new(1472, 100, 340, 70));
        // Abajo a la izquierda: quietos el izquierdo y el inferior.
        let bottom_left = pill(100, 900).resize(340, 70, &LEFT, None);
        assert_eq!(bottom_left, Rect::new(100, 908, 340, 70));
    }

    #[test]
    fn compactar_y_volver_la_deja_donde_estaba() {
        for edge in [Edge::Left, Edge::Right, Edge::Top, Edge::Bottom] {
            let docked = pill(700, 400).dock(&LEFT, edge, GAP);
            let compact = docked.resize_in(112, 46, &LEFT, Some(edge), GAP);
            assert_eq!(compact.edge_within(&LEFT, GAP), Some(edge));
            let back = compact.resize_in(212, 78, &LEFT, Some(edge), GAP);
            assert_eq!(back.dock(&LEFT, edge, GAP), back);
        }
    }

    #[test]
    fn el_fin_de_fase_no_se_sale_del_area() {
        for x in [12, 900, 1696] {
            let grown = pill(x, 990).resize_in(340, 70, &LEFT, None, GAP);
            assert!(grown.x >= GAP && grown.right() <= 1920 - GAP);
            assert!(grown.y >= GAP && grown.bottom() <= 1080 - GAP);
        }
    }

    #[test]
    fn las_medidas_siguen_la_escala_del_monitor() {
        let area = Area {
            rect: RIGHT,
            scale: 1.5,
        };
        assert_eq!(area.px(16.0), 24);
        assert_eq!(area.px(212.0), 318);
    }
}
