import { useState, useEffect } from 'react';
import {Checkbox, TextInput, MultiSelect, Button, LoadingOverlay} from '@mantine/core';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import QualifiedName from './qualified-name';
import DisplayNameCellRenderer from './displayNameCellRenderer';

import {
  ASSET_CATALOG_PATH,
  PAGE_SIZE_INCREASE_VALUE,
  QUERY_MIN_LENGTH,
  formData,
  getQueryParams,
  getQueryParamsPath,
  fetchTypes,
  fetchRawData,
  isStringLonger,
  isArrayEmpty
} from '@lfai/egeria-js-commons';


/**
 * Initial empty form value.
 */
const emptyForm: formData = {
  q: '',
  types: [] as Array<string>,
  exactMatch: false,
  caseSensitive: false,
  pageSize: 25
};

/**
 * Initial types data value.
 */
const emptyTypesData: Array<any> = [];

export function EgeriaAssetCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParams = getQueryParams(searchParams);
  const navigate = useNavigate();

  const [typesData, setTypesData] = useState({
    isLoading: false,
    typesData: [...emptyTypesData, ...queryParams.types]
  } as any);

  const [form, setForm] = useState({
    ...emptyForm,
    qIsPristine : true,
    qIsValid : false,
    typesIsPristine : true,
    typesIsValid : false,
    ...queryParams
  } as any);

  const [rowData, setRowData] = useState({
    isLoading: false,
    rowData: [] as any
  });

  /*
   * Contains AGGrid data-table information and config.
   */
  const gridOptions = {
    suppressCellFocus: true,
    defaultColDef: {
      sortable: true,
      resizable: true,
      minWidth: 150
    },
    columnDefs: [
      {
        field: 'properties.displayName',
        filter: true,
        headerName: 'Name',
        cellRenderer: (params: any) => {
          return <DisplayNameCellRenderer data={params.data}/>;
        }
      },
      {field: 'origin.metadataCollectionName', filter: true, headerName: 'Origin' },
      {field: 'type.name', filter: true, headerName: 'Type' },
      {
        field: 'properties.qualifiedName',
        filter: true,
        headerName: 'Context Info',
        cellRenderer: (params: any) => {
          return <QualifiedName qualified={params.value}/>;
        }
      },
      {field: 'properties.summary', filter: true, headerName: 'Description' }
    ],
    onFirstDataRendered: (params: any) => {
      const allColumnIds: string[] = [];

      params.columnApi.getColumns()?.forEach((column: any) => {
        allColumnIds.push(column.getId());
      });

      params.columnApi.autoSizeColumns(allColumnIds, true);
    }
  };

  useEffect(() => {
    const _queryParams = getQueryParams(searchParams);
    let qip = form.qIsPristine
    let qiv = form.qIsValid
    let tip = form.typesIsPristine
    let tiv = form.typesIsValid
    if (_queryParams.q !== '' && qip) {
      qip = false;
      qiv = isStringLonger(_queryParams.q, QUERY_MIN_LENGTH)
    }
    if (!isArrayEmpty(_queryParams.types) && tip) {
      tip = false;
      tiv = !isArrayEmpty(_queryParams.types)
    }
    setForm({
      ..._queryParams,
      qIsPristine : qip,
      qIsValid : qiv,
      typesIsPristine : tip,
      typesIsValid : tiv
    });

  }, [searchParams]);


  useEffect(() => {
    setTypesData({...typesData, isLoading: true});

    const bringTypes = async () => {
      const rawTypesData = await fetchTypes();

      setTypesData({
        isLoading: false,
        typesData: [...rawTypesData]
      });
    };

    bringTypes();
  }, []);

  useEffect(() => {
    const _queryParams = getQueryParams(searchParams);

    setRowData({...rowData, isLoading: true});

    const queryData = async () => {
      const _rowData = await fetchRawData({...form, ..._queryParams});

      setRowData({
        isLoading: false,
        rowData: [
          ..._rowData
        ]
      });
    };

    queryData();
  }, [searchParams]);

  /*
   * Submit handler for the main form.
   */
  const submit = () => {
    if (form.qIsPristine) {
      form.qIsPrestine = !form.qIsPristine
    }
    if (form.typesIsPristine) {
      form.typesIsPristine = !form.typesIsPristine
    }

    if (form.qIsValid && form.typesIsValid) {
      setSearchParams(form);
    }
  };

  /*
   * Submit handler for the main form on ENTER keypress.
   */
  const handleEnterPress = (e: any) => {
    if(e.key === 'Enter') {
      submit();
    }
  };

  /*
   * Load more handler for loading more elements, pagination.
   */
  const loadMore = () => {
    const newPageSize = form.pageSize + PAGE_SIZE_INCREASE_VALUE;
    const newFormData = {...form, pageSize: newPageSize};

    // TODO: check if last page (new array === last data array)
    setForm({
      ...newFormData
    });

    goTo(newFormData);
  };

  /*
   * Method used to update current browser's URL.
   */
  const goTo = (formData: formData) => {
    const path = ASSET_CATALOG_PATH;
    const queryParams = getQueryParamsPath(formData);

    navigate(`${path}${queryParams.length ? `?${queryParams.join('&')}` : ''}` );
  };

  return (
    <>
    <div style={{ display: 'flex', alignItems: 'stretch', flexDirection: 'column', position: 'relative', height: '100%', }}>
      <LoadingOverlay visible={rowData.isLoading || typesData.isLoading} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10}}>
        <TextInput mr="xl"
                   style={{minWidth: 180}}
                   placeholder="Search"
                   value={form.q}
                   required
                   error={(!form.qIsPristine) && !form.qIsValid  ? 'Query must be at least ' + QUERY_MIN_LENGTH + ' characters' : ''}
                   onKeyPress={handleEnterPress}
                   onChange={(event: any) => setForm({
                     ...form,
                     q: event.currentTarget.value,
                     qIsPristine : false,
                     qIsValid : isStringLonger(form.q, QUERY_MIN_LENGTH)
                   })} />

        <MultiSelect mr="xl"
                     style={{minWidth: 230}}
                     data={typesData.typesData}
                     value={form.types}
                     error={!form.typesIsPristine && !form.typesIsValid ? 'At least one type has to be selected' : ''}
                     placeholder="Types"
                     onChange={(value) => setForm({
                       ...form,
                       types: [...value],
                       typesIsPristine : false,
                       typesIsValid : !isArrayEmpty(form.types)
                     })} />

        <Checkbox mr="xl"
                  label={'Exact match'}
                  checked={form.exactMatch}
                  onChange={(event) => setForm({...form, exactMatch: event.currentTarget.checked})} />

        <Checkbox mr="xl"
                  label={'Case sensitive'}
                  checked={form.caseSensitive}
                  onChange={(event) => setForm({...form, caseSensitive: event.currentTarget.checked})} />

        <Button onClick={() => submit()}>
          Search
        </Button>

      </div>
      <div className="ag-theme-alpine" style={{width: '100%', height: '100%'}}>
        <AgGridReact gridOptions={gridOptions}
                     rowData={rowData.rowData} />
      </div>

      <div>
        <Button size="xs" compact fullWidth onClick={() => loadMore()} style={{marginBottom:1, marginTop:10}}>
          Load more...
        </Button>
      </div>
    </div>
    </>
  );
}
