import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getCompanies, getCompanyLocations, getCompanyAssets } from './src/api';

// Importando os ícones fornecidos
import locationIcon from './assets/icons/location.png';
import assetIcon from './assets/icons/asset.png';
import componentIcon from './assets/icons/component.png';

// Define o tamanho da página para paginação e carregar de 50 em 50
// Como a API não suportava paginação, tive que fazer a otimização pelo lado do cliente
const PAGE_SIZE = 50;

const App = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [allAssets, setAllAssets] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showEnergySensors, setShowEnergySensors] = useState(false);
  const [showCriticalStatus, setShowCriticalStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Carrega as empresas ao montar o componente
  useEffect(() => {
    const fetchCompanies = async () => {
      const response = await getCompanies();
      setCompanies(response.data);
    };

    fetchCompanies();
  }, []);

  // Lida com a seleção de uma empresa e traz os assets
  const handleCompanySelect = async (companyId) => {
    setLoading(true);
    const locationsResponse = await getCompanyLocations(companyId);
    const assetsResponse = await getCompanyAssets(companyId);

    setAllAssets(assetsResponse.data); // Armazena todos os ativos
    const paginatedAssets = assetsResponse.data.slice(0, PAGE_SIZE); // Pega a primeira página de ativos

    const tree = buildTree(locationsResponse.data, paginatedAssets, {});
    setTreeData(tree);
    setFilteredData(tree);
    setSelectedCompany(companyId);
    setLoading(false);
    setPage(1);
  };

  // Carrega mais ativos ao rolar a página a medida que vai em vez de trazer todos de uma vez
  const loadMoreAssets = () => {
    if (loading) return;

    setLoading(true);
    const newPage = page + 1;
    const startIndex = (newPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const newAssets = allAssets.slice(startIndex, endIndex);

    const updatedTree = buildTree([], newAssets, treeData);
    setTreeData(updatedTree);
    setFilteredData(updatedTree);
    setPage(newPage);
    setLoading(false);
  };

  // Constroi a árvore de dados
  const buildTree = (locations, assets, existingTree) => {
    const locationMap = {};
    const assetMap = {};

    // Mapeia as localizações
    locations.forEach(location => {
      locationMap[location.id] = { ...location, type: 'location', children: [] };
    });

    // Mapeia os ativos
    assets.forEach(asset => {
      assetMap[asset.id] = { ...asset, type: asset.sensorType ? 'component' : 'asset', children: [] };
    });

    const root = existingTree[0] || { id: 'root', name: 'Root', type: 'root', children: [] };

    // Monta a árvore de localizações
    locations.forEach(location => {
      if (location.parentId && locationMap[location.parentId]) {
        locationMap[location.parentId].children.push(locationMap[location.id]);
      } else {
        root.children.push(locationMap[location.id]);
      }
    });

    // Monta a árvore de ativos
    assets.forEach(asset => {
      if (asset.parentId && assetMap[asset.parentId]) {
        assetMap[asset.parentId].children.push(assetMap[asset.id]);
      } else if (asset.locationId && locationMap[asset.locationId]) {
        locationMap[asset.locationId].children.push(assetMap[asset.id]);
      } else {
        root.children.push(assetMap[asset.id]);
      }
    });

    return [root];
  };

  // Aplica os filtros à árvore de dados
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

  // Filtra a árvore de dados pelo texto de busca
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

  // Filtra a árvore de dados para mostrar apenas sensores de energia
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

  // Filtra a árvore de dados para mostrar apenas status críticos
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

  // Renderiza a árvore de dados
  const renderTree = ({ item: node }) => (
    <View key={node.id} style={styles.node}>
      <View style={styles.nodeContent}>
        <Image source={getIconSource(node.type)} style={styles.icon} />
        <Text style={styles.nodeText}>{node.name}</Text>
        {node.sensorType === 'energy' && <Icon name="bolt" size={16} color="green" style={styles.sensorIcon} />}
        {node.status === 'critical' && <Icon name="error" size={16} color="red" style={styles.criticalIcon} />}
      </View>
      {node.children && (
        <View style={styles.childrenContainer}>
          {node.children.map((child) => renderTree({ item: child }))}
        </View>
      )}
    </View>
  );

  // Retorna o ícone apropriado para o tipo de nó
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

  // Aplica os filtros sempre que os estados de filtro mudarem
  useEffect(() => {
    applyFilters();
  }, [searchText, showEnergySensors, showCriticalStatus, treeData]);

  // Lida com o botão de voltar
  const handleBackPress = () => {
    setSelectedCompany(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Assets</Text>
      </View>
      {!selectedCompany ? (
        <View style={styles.companyListContainer}>
          <FlatList
            data={companies}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleCompanySelect(item.id)} style={styles.companyButton}>
                <Text style={styles.companyText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : (
        <View style={styles.treeContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar Ativo ou Local"
            value={searchText}
            onChangeText={setSearchText}
          />
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, showEnergySensors && styles.filterButtonActive]}
              onPress={() => setShowEnergySensors(!showEnergySensors)}
            >
              <Icon name="bolt" size={16} color={showEnergySensors ? '#fff' : '#000'} />
              <Text style={styles.filterButtonText}>Sensor de Energia</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, showCriticalStatus && styles.filterButtonActive]}
              onPress={() => setShowCriticalStatus(!showCriticalStatus)}
            >
              <Icon name="error" size={16} color={showCriticalStatus ? '#fff' : '#000'} />
              <Text style={styles.filterButtonText}>Crítico</Text>
            </TouchableOpacity>
          </View>
          {loading && <ActivityIndicator size="large" color="#0000ff" />}
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
            renderItem={renderTree}
            onEndReached={loadMoreAssets}
            onEndReachedThreshold={0.1}
            ListFooterComponent={loading && <ActivityIndicator size="large" color="#0000ff" />}
          />
        </View>
      )}
    </View>
  );
};

// Estilos para o componente App
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b5998',
    paddingHorizontal: 10,
    paddingVertical: 15,
    paddingTop: 45
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyListContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
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
  treeContainer: {
    flex: 1,
    paddingTop: 35
  },
  node: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderColor: '#ccc',
    marginBottom: 5,
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
  sensorIcon: {
    marginLeft: 5,
  },
  criticalIcon: {
    marginLeft: 5,
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginHorizontal: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
    borderRadius: 5,
  },
  filterButtonActive: {
    backgroundColor: '#3b5998',
  },
  filterButtonText: {
    fontSize: 14,
    marginLeft: 5,
  },
});

export default App;
