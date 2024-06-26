import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator } from 'react-native';
import { getCompanies, getCompanyLocations, getCompanyAssetsPaginated } from './src/api'; // Atualize para usar a API paginada
import Icon from 'react-native-vector-icons/MaterialIcons';

// Importando ícones
import locationIcon from './assets/icons/location.png';
import assetIcon from './assets/icons/asset.png';
import componentIcon from './assets/icons/component.png';

const App = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showEnergySensors, setShowEnergySensors] = useState(false);
  const [showCriticalStatus, setShowCriticalStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1); // Estado para gerenciar a página atual
  const [allLoaded, setAllLoaded] = useState(false); // Estado para indicar se todos os dados foram carregados

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        const response = await getCompanies();
        setCompanies(response.data);
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleCompanySelect = async (companyId) => {
    setLoading(true);
    setPage(1);
    setAllLoaded(false);
    try {
      const locationsResponse = await getCompanyLocations(companyId);
      const assetsResponse = await getCompanyAssetsPaginated(companyId, 1); // Carregar a primeira página

      console.log("Locations Response:", locationsResponse.data);
      console.log("Assets Response:", assetsResponse.data);

      const tree = buildTree(locationsResponse.data, assetsResponse.data);
      setTreeData(tree);
      setFilteredData(tree);
      setSelectedCompany(companyId);
    } catch (error) {
      console.error("Error selecting company:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreAssets = async () => {
    if (allLoaded || loading) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const assetsResponse = await getCompanyAssetsPaginated(selectedCompany, nextPage);

      if (assetsResponse.data.length === 0) {
        setAllLoaded(true);
      } else {
        const newTreeData = buildTree(treeData[0].children, assetsResponse.data);
        setTreeData(newTreeData);
        setFilteredData(newTreeData);
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Error loading more assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (locations, assets) => {
    const locationMap = {};
    const assetMap = {};

    locations.forEach(location => {
      locationMap[location.id] = { ...location, type: 'location', children: [] };
    });

    assets.forEach(asset => {
      assetMap[asset.id] = { ...asset, type: asset.sensorType ? 'component' : 'asset', children: [] };
    });

    const root = { id: 'root', name: 'Root', type: 'root', children: [] };

    locations.forEach(location => {
      if (location.parentId) {
        locationMap[location.parentId].children.push(locationMap[location.id]);
      } else {
        root.children.push(locationMap[location.id]);
      }
    });

    assets.forEach(asset => {
      if (asset.parentId) {
        assetMap[asset.parentId].children.push(assetMap[asset.id]);
      } else if (asset.locationId) {
        locationMap[asset.locationId].children.push(assetMap[asset.id]);
      } else {
        root.children.push(assetMap[asset.id]);
      }
    });

    console.log("Tree Data:", root);

    return [root];
  };

  const applyFilters = () => {
    let filtered = [...treeData];

    if (searchText) {
      filtered = filterTreeByText(filtered, searchText);
    }

    if (showEnergySensors) {
      filtered = filterTreeByEnergySensors(filtered);
    }

    if (showCriticalStatus) {
      filtered = filterTreeByCriticalStatus(filtered);
    }

    setFilteredData(filtered);
  };

  const filterTreeByText = (nodes, text) => {
    return nodes.reduce((acc, node) => {
      if (node.name.toLowerCase().includes(text.toLowerCase())) {
        acc.push(node);
      } else if (node.children) {
        const filteredChildren = filterTreeByText(node.children, text);
        if (filteredChildren.length) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };

  const filterTreeByEnergySensors = (nodes) => {
    return nodes.reduce((acc, node) => {
      if (node.sensorType === 'energy') {
        acc.push(node);
      } else if (node.children) {
        const filteredChildren = filterTreeByEnergySensors(node.children);
        if (filteredChildren.length) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };

  const filterTreeByCriticalStatus = (nodes) => {
    return nodes.reduce((acc, node) => {
      if (node.status === 'critical') {
        acc.push(node);
      } else if (node.children) {
        const filteredChildren = filterTreeByCriticalStatus(node.children);
        if (filteredChildren.length) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };

  const renderTree = (node) => (
    <View key={node.id} style={styles.node}>
      <TouchableOpacity style={styles.nodeContent}>
        <Image source={getIconSource(node.type)} style={styles.icon} />
        <Text style={styles.nodeText}>{node.name}</Text>
        {node.sensorType === 'energy' && <Icon name="bolt" style={styles.statusIcon} size={16} color="green" />}
        {node.status === 'critical' && <Icon name="error" style={styles.statusIcon} size={16} color="red" />}
      </TouchableOpacity>
      {node.children && (
        <View style={styles.childrenContainer}>
          {node.children.map((child) => renderTree(child))}
        </View>
      )}
    </View>
  );

  const getIconSource = (type) => {
    switch (type) {
      case 'location':
        return locationIcon;
      case 'asset':
        return assetIcon;
      case 'component':
        return componentIcon;
      default:
        return null;
    }
  };

  useEffect(() => {
    applyFilters();
  }, [searchText, showEnergySensors, showCriticalStatus]);

  if (loading && page === 1) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asset Tree Viewer</Text>
      {!selectedCompany ? (
        // Renderiza a lista de empresas se nenhuma empresa estiver selecionada
        <FlatList
          data={companies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleCompanySelect(item.id)} style={styles.companyButton}>
              <Text style={styles.companyText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        // Renderiza a árvore e os filtros se uma empresa estiver selecionada
        <ScrollView
          onScroll={({ nativeEvent }) => {
            if (isCloseToBottom(nativeEvent)) {
              loadMoreAssets();
            }
          }}
          scrollEventThrottle={400}
        >
          <TouchableOpacity onPress={() => setSelectedCompany(null)} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="black" />
            <Text style={styles.backButtonText}>Voltar para Empresas</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar Ativo ou Localização"
            value={searchText}
            onChangeText={setSearchText}
          />
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, showEnergySensors && styles.filterButtonActive]}
              onPress={() => setShowEnergySensors(!showEnergySensors)}
            >
              <Text style={styles.filterButtonText}>Sensor de Energia</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, showCriticalStatus && styles.filterButtonActive]}
              onPress={() => setShowCriticalStatus(!showCriticalStatus)}
            >
              <Text style={styles.filterButtonText}>Crítico</Text>
            </TouchableOpacity>
          </View>
          <View>{filteredData.map((node) => renderTree(node))}</View>
          {loading && <ActivityIndicator size="large" color="#0000ff" />}
        </ScrollView>
      )}
    </View>
  );
};

// Função para verificar se está próximo do fim da lista
const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
};

// Estilos para o componente App
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 50, // Adiciona margem superior ao título
  },
  companyButton: {
    padding: 10,
    backgroundColor: '#ddd',
    marginBottom: 10,
    borderRadius: 5,
  },
  companyText: {
    fontSize: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonText: {
    marginLeft: 5,
    fontSize: 16,
  },
  node: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderColor: '#ccc',
  },
  nodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  nodeText: {
    marginLeft: 5,
    fontSize: 14,
  },
  childrenContainer: {
    paddingLeft: 10,
  },
  icon: {
    width: 20,
    height: 20,
  },
  statusIcon: {
    marginLeft: 5,
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  filterButton: {
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  filterButtonActive: {
    backgroundColor: '#aaa',
  },
  filterButtonText: {
    fontSize: 14,
  },
});

export default App;
