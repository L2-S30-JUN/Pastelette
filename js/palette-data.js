/* ═══════════════════════════════════════════
   Pastelette — Curated Palette Map
   Each palette: varied saturation, not monochromatic
   ═══════════════════════════════════════════ */

'use strict';

const PALETTE_MAP = {
  forest: [
    { hex: '#1E3D20', name: 'Old Growth',    nameKo: '원시림'       },
    { hex: '#4A8B3F', name: 'Vivid Canopy',  nameKo: '선명한 수관'  },
    { hex: '#8DB87A', name: 'Fern',          nameKo: '고사리'       },
    { hex: '#C9DFC0', name: 'Morning Mist',  nameKo: '아침 안개'    },
    { hex: '#EDF5E8', name: 'Pale Canopy',   nameKo: '연한 수관'    },
  ],
  ocean: [
    { hex: '#0D2840', name: 'Abyss',         nameKo: '심연'         },
    { hex: '#1C7AAD', name: 'Open Water',    nameKo: '열린 바다'    },
    { hex: '#5AB8D8', name: 'Wave Crest',    nameKo: '파도 마루'    },
    { hex: '#B0DDF0', name: 'Seafoam',       nameKo: '물거품'       },
    { hex: '#E8F6FC', name: 'Shore Mist',    nameKo: '해안 안개'    },
  ],
  sunset: [
    { hex: '#8C2A08', name: 'Ember Core',    nameKo: '잉걸불'       },
    { hex: '#E85C1A', name: 'Blaze',         nameKo: '불꽃'         },
    { hex: '#F5A630', name: 'Golden Hour',   nameKo: '황금빛'       },
    { hex: '#F5D49A', name: 'Dusk Glow',     nameKo: '황혼 빛'      },
    { hex: '#FBF0E0', name: 'Evening Haze',  nameKo: '저녁 안개'    },
  ],
  cozy: [
    { hex: '#5C3018', name: 'Dark Walnut',   nameKo: '짙은 호두나무' },
    { hex: '#C47840', name: 'Warm Amber',    nameKo: '따뜻한 호박'   },
    { hex: '#E8BF90', name: 'Biscuit',       nameKo: '비스킷'        },
    { hex: '#F0DCC0', name: 'Linen',         nameKo: '린넨'          },
    { hex: '#FAF3EC', name: 'Candlelight',   nameKo: '촛불빛'        },
  ],
  bloom: [
    { hex: '#7A1838', name: 'Deep Rose',     nameKo: '진한 장미'    },
    { hex: '#D63868', name: 'Vivid Bloom',   nameKo: '선명한 꽃'    },
    { hex: '#EE9AB8', name: 'Petal',         nameKo: '꽃잎'         },
    { hex: '#F8D4E4', name: 'Blush',         nameKo: '홍조'         },
    { hex: '#FDF0F5', name: 'First Bloom',   nameKo: '첫 개화'      },
  ],
  winter: [
    { hex: '#1A2A4A', name: 'Arctic Night',  nameKo: '북극의 밤'    },
    { hex: '#3A78C8', name: 'Ice Blue',      nameKo: '아이스 블루'  },
    { hex: '#90B8E0', name: 'Frost',         nameKo: '서리'         },
    { hex: '#C8DCF0', name: 'Snow Mist',     nameKo: '눈 안개'      },
    { hex: '#EEF5FC', name: 'Snowfield',     nameKo: '설원'         },
  ],
  desert: [
    { hex: '#4A2408', name: 'Red Mesa',      nameKo: '붉은 대지'    },
    { hex: '#C87838', name: 'Terracotta',    nameKo: '테라코타'      },
    { hex: '#E0B070', name: 'Sand Dune',     nameKo: '모래 사구'    },
    { hex: '#EED8B0', name: 'Pale Stone',    nameKo: '연한 암석'    },
    { hex: '#F8F0E0', name: 'Heat Haze',     nameKo: '아지랑이'     },
  ],
  midnight: [
    { hex: '#060C18', name: 'Void',          nameKo: '어둠'         },
    { hex: '#1A3868', name: 'Night Sky',     nameKo: '밤하늘'       },
    { hex: '#3A70B8', name: 'Twilight',      nameKo: '황혼'         },
    { hex: '#78A8D8', name: 'Starlight',     nameKo: '별빛'         },
    { hex: '#C0D8F0', name: 'Dawn Edge',     nameKo: '여명 경계'    },
  ],
  봄: [
    { hex: '#2E6830', name: 'New Leaf',      nameKo: '새싹'         },
    { hex: '#E05890', name: 'Cherry Burst',  nameKo: '벚꽃 만개'    },
    { hex: '#A8D890', name: 'Spring Green',  nameKo: '봄 초록'      },
    { hex: '#F0C8E0', name: 'Lilac Mist',    nameKo: '라일락 안개'  },
    { hex: '#FEF5F0', name: 'Spring Dawn',   nameKo: '봄 여명'      },
  ],
  가을: [
    { hex: '#6E1808', name: 'Fallen Maple',  nameKo: '낙엽 단풍'    },
    { hex: '#D84A10', name: 'Maple Blaze',   nameKo: '단풍 불꽃'    },
    { hex: '#E8A040', name: 'Harvest Gold',  nameKo: '수확의 황금'  },
    { hex: '#C8905A', name: 'Earth',         nameKo: '흙'           },
    { hex: '#F8E8D0', name: 'Amber Mist',    nameKo: '호박 안개'    },
  ],
  그리움: [
    { hex: '#2A2048', name: 'Old Memory',    nameKo: '오래된 기억'  },
    { hex: '#5848A8', name: 'Longing',       nameKo: '그리움'       },
    { hex: '#A090D0', name: 'Twilight Haze', nameKo: '황혼 안개'    },
    { hex: '#D0C8E8', name: 'Soft Echo',     nameKo: '부드러운 메아리' },
    { hex: '#F5F2FC', name: 'Faded Dream',   nameKo: '바랜 꿈'      },
  ],
  fog: [
    { hex: '#384050', name: 'Dense Fog',     nameKo: '짙은 안개'    },
    { hex: '#6888A0', name: 'Rain Mist',     nameKo: '빗속 안개'    },
    { hex: '#A8BCC8', name: 'Silver Veil',   nameKo: '은빛 베일'    },
    { hex: '#D8E4EC', name: 'Morning Haze',  nameKo: '아침 안개'    },
    { hex: '#F2F6FA', name: 'White Mist',    nameKo: '흰 안개'      },
  ],
  cherry: [
    { hex: '#500818', name: 'Dark Cherry',   nameKo: '짙은 체리'    },
    { hex: '#C02040', name: 'Cherry Red',    nameKo: '체리 빨강'    },
    { hex: '#E87090', name: 'Blossom',       nameKo: '꽃잎'         },
    { hex: '#F5B8C8', name: 'Blush Pink',    nameKo: '볼연지'       },
    { hex: '#FDE8EE', name: 'Rose Mist',     nameKo: '장미 안개'    },
  ],
  lavender: [
    { hex: '#3A2858', name: 'Deep Violet',   nameKo: '짙은 보라'    },
    { hex: '#7B58B8', name: 'True Lavender', nameKo: '순수 라벤더'  },
    { hex: '#B098D8', name: 'Soft Mauve',    nameKo: '부드러운 자주' },
    { hex: '#D8CDF0', name: 'Lilac',         nameKo: '라일락'       },
    { hex: '#F4F0FC', name: 'Pale Bloom',    nameKo: '연한 꽃'      },
  ],
  rain: [
    { hex: '#1A2D48', name: 'Stormy Deep',   nameKo: '폭풍우'       },
    { hex: '#2870B0', name: 'Rain Blue',     nameKo: '빗속 파랑'    },
    { hex: '#80B0D0', name: 'Drizzle',       nameKo: '이슬비'       },
    { hex: '#B8D4E8', name: 'After Rain',    nameKo: '비 온 뒤'     },
    { hex: '#E8F2F8', name: 'Clear Mist',    nameKo: '맑은 안개'    },
  ],
  night: [
    { hex: '#080D18', name: 'Deep Void',     nameKo: '깊은 어둠'    },
    { hex: '#1C3868', name: 'Night Blue',    nameKo: '밤의 파랑'    },
    { hex: '#4878B0', name: 'Moonlit',       nameKo: '달빛 물든'    },
    { hex: '#80A8CC', name: 'Starlight',     nameKo: '별빛'         },
    { hex: '#C8DCF0', name: 'Pre-dawn',      nameKo: '새벽 전'      },
  ],
  coffee: [
    { hex: '#200C00', name: 'Espresso',      nameKo: '에스프레소'   },
    { hex: '#783010', name: 'Dark Roast',    nameKo: '다크 로스트'  },
    { hex: '#C07030', name: 'Caramel',       nameKo: '캐러멜'       },
    { hex: '#E0B878', name: 'Latte',         nameKo: '라떼'         },
    { hex: '#F8ECD8', name: 'Milk Foam',     nameKo: '밀크폼'       },
  ],
  마음: [
    { hex: '#302048', name: 'Inner Depth',   nameKo: '내면의 깊이'  },
    { hex: '#7058B0', name: 'Calm Violet',   nameKo: '고요한 보라'  },
    { hex: '#B8A0D8', name: 'Gentle Haze',   nameKo: '온화한 안개'  },
    { hex: '#E0D4EC', name: 'Inner Peace',   nameKo: '내면의 평화'  },
    { hex: '#F8F4FE', name: 'Stillness',     nameKo: '고요함'       },
  ],
  sky: [
    { hex: '#0A3060', name: 'Deep Sky',      nameKo: '깊은 하늘'    },
    { hex: '#1878D0', name: 'Azure',         nameKo: '하늘색'       },
    { hex: '#70B8F0', name: 'Cloud',         nameKo: '구름'         },
    { hex: '#B8DDF8', name: 'Pale Sky',      nameKo: '연한 하늘'    },
    { hex: '#E8F5FE', name: 'Horizon',       nameKo: '지평선'       },
  ],
  smoke: [
    { hex: '#282828', name: 'Charcoal',      nameKo: '숯'           },
    { hex: '#585858', name: 'Ash',           nameKo: '재'           },
    { hex: '#989898', name: 'Smoke',         nameKo: '연기'         },
    { hex: '#C8C8C8', name: 'Silver',        nameKo: '은빛'         },
    { hex: '#F0F0F0', name: 'White Ash',     nameKo: '하얀 재'      },
  ],
  spring:  null,  // set below
  autumn:  null,
  longing: null,
  fall:    null,
};

// Aliases
PALETTE_MAP.spring  = PALETTE_MAP.봄;
PALETTE_MAP.autumn  = PALETTE_MAP.가을;
PALETTE_MAP.fall    = PALETTE_MAP.가을;
PALETTE_MAP.longing = PALETTE_MAP.그리움;
PALETTE_MAP.mind    = PALETTE_MAP.마음;
PALETTE_MAP.heart   = PALETTE_MAP.마음;

window.PALETTE_MAP = PALETTE_MAP;
